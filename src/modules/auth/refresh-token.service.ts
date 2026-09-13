import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UnauthorizedException } from '../../common/errors/app.exception';
import {
  generateId,
  generateToken,
  hashToken,
} from '../../common/utils/ids.util';
import { durationToSeconds } from '../../common/utils/duration.util';
import { PrismaService } from '../../database/prisma.service';

/** How long a revoked row is kept around before cleanup — long enough to be useful for incident review. */
const REVOKED_RETENTION_DAYS = 30;

export interface IssuedRefreshToken {
  token: string;
  family: string;
}

/** Where/what a session was started from — captured at login, carried across rotations. */
export interface SessionMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

/**
 * DB-backed refresh sessions with rotation. Only the SHA-256 hash is stored.
 * Every refresh revokes the presented token and issues a new one in the same
 * `family`; presenting an ALREADY-ROTATED token means it leaked — the whole
 * family is revoked (stolen-token defense) and the user must sign in again.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async issue(
    userId: string,
    family?: string,
    meta?: SessionMeta,
  ): Promise<IssuedRefreshToken> {
    const token = generateToken(32);
    const resolvedFamily = family ?? generateId();
    const ttlSeconds = durationToSeconds(
      this.configService.get<string>('auth.refreshTokenExpiresIn') ?? '30d',
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        family: resolvedFamily,
        userAgent: meta?.userAgent?.slice(0, 400) ?? null,
        ipAddress: meta?.ipAddress?.slice(0, 45) ?? null,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    return { token, family: resolvedFamily };
  }

  async rotate(
    rawToken: string,
  ): Promise<IssuedRefreshToken & { userId: string }> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid session. Please sign in again.');
    }

    if (record.revokedAt) {
      // Reuse of a rotated token = leaked token. Kill the whole family.
      await this.revokeFamily(record.family);
      this.logger.warn(
        `Refresh-token reuse detected — family ${record.family} revoked (user ${record.userId})`,
      );
      throw new UnauthorizedException(
        'Session security violation detected. Please sign in again.',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    // Carry the family's origin device info forward so the session keeps its
    // identity across rotations.
    const issued = await this.issue(record.userId, record.family, {
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
    });
    return { ...issued, userId: record.userId };
  }

  async revokeByRawToken(rawToken: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (record) {
      await this.revokeFamily(record.family);
    }
  }

  async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke every active session for a user (e.g. after a password reset). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * The table gets a row on every login and every rotation, and nothing
   * ever removed one — deletes rows that are no longer useful: expired
   * (whether or not they were ever revoked) or revoked long enough ago
   * that they're past being useful for incident review.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    const revokedRetentionCutoff = new Date(
      Date.now() - REVOKED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: revokedRetentionCutoff } },
        ],
      },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired/stale refresh token(s).`);
    }
  }
}

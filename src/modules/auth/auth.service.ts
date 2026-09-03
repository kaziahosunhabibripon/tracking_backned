import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User as PrismaUser } from '@prisma/client';
import { UnauthorizedException } from '../../common/errors/app.exception';
import { durationToSeconds } from '../../common/utils/duration.util';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterAffiliateInput } from './dto/register-affiliate.input';
import { SignInInput } from './dto/sign-in.input';
import { AuthPayload } from './models/auth-payload.model';
import { RefreshTokenService, SessionMeta } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Creates the User + its Affiliate application profile in one transaction —
   * a half-created account (user row with no affiliate profile) must never be
   * possible. New affiliates start `AffiliateStatus.PENDING`; this still
   * signs them in immediately (matches the form's "Apply Now" flow) — gating
   * dashboard features on that status is a frontend/Phase-3-resolver concern.
   */
  async registerAffiliate(
    input: RegisterAffiliateInput,
    meta?: SessionMeta,
  ): Promise<AuthPayload> {
    await this.usersService.assertEmailAvailable(input.email);
    const hashedPassword = await this.usersService.hashPassword(input.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });

      await tx.affiliate.create({
        data: {
          userId: createdUser.id,
          businessType: input.businessType,
          phone: input.phone,
          country: input.country,
          contactMethod: input.contactMethod,
          currentPlatform: input.currentPlatform,
          referralSource: input.referralSource,
        },
      });

      return createdUser;
    });

    return this.createAuthPayload(user, meta);
  }

  async signIn(input: SignInInput, meta?: SessionMeta): Promise<AuthPayload> {
    const user = await this.usersService.validateLocalCredentials(
      input.email,
      input.password,
    );
    await this.usersService.touchLastLogin(user.id);
    return this.createAuthPayload(user, meta);
  }

  /** Rotate the presented refresh token and mint a fresh session. */
  async refreshSession(rawRefreshToken: string): Promise<AuthPayload> {
    const rotated = await this.refreshTokenService.rotate(rawRefreshToken);

    const user = await this.usersService.findById(rotated.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized.');
    }

    return this.buildPayload(user, rotated.token);
  }

  /** Revoke the session family behind the presented refresh token (if any). */
  async logout(rawRefreshToken?: string | null): Promise<void> {
    if (rawRefreshToken) {
      await this.refreshTokenService.revokeByRawToken(rawRefreshToken);
    }
  }

  private async createAuthPayload(
    user: PrismaUser,
    meta?: SessionMeta,
  ): Promise<AuthPayload> {
    const issued = await this.refreshTokenService.issue(
      user.id,
      undefined,
      meta,
    );
    return this.buildPayload(user, issued.token);
  }

  private async buildPayload(
    user: PrismaUser,
    refreshToken: string,
  ): Promise<AuthPayload> {
    const accessExpiresInValue =
      this.configService.get<string>('auth.jwtExpiresIn') ?? '15m';
    const refreshExpiresInValue =
      this.configService.get<string>('auth.refreshTokenExpiresIn') ?? '30d';

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: accessExpiresInValue as never },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: durationToSeconds(accessExpiresInValue),
      refreshExpiresIn: durationToSeconds(refreshExpiresInValue),
      user,
    };
  }
}

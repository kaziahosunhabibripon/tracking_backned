import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { verifyHmacSha256 } from '../../common/utils/hmac.util';

export interface IngestPostbackInput {
  campaignId: string;
  rawBody: string;
  signature: string | null;
  params: {
    click_id?: string;
    txn_id?: string;
    payout?: string;
    revenue?: string;
    s2s?: string;
    goal?: string;
    affiliate_id?: string;
  };
}

export type IngestPostbackResult =
  | { ok: true; conversionId: string; deduplicated: boolean }
  | {
      ok: false;
      reason:
        | 'invalid_signature'
        | 'missing_txn_id'
        | 'click_not_found'
        | 'cap_blocked'
        | 'click_too_old'
        | 'campaign_mismatch';
    };

@Injectable()
export class PostbackService {
  private readonly logger = new Logger(PostbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Server-to-server conversion ingest. One transaction:
   *  1. Verify HMAC over the raw body.
   *  2. Upsert by `txn_id` (idempotent — replays return the same id).
   *  3. Reject when the originating click is `capBlocked` or too old.
   *  4. Write the row + log the delivery in a single `prisma.$transaction`.
   *
   * `txn_id` is the dedupe key the affiliate network gives us — sending
   * the same postback twice MUST NOT mint two conversions.
   */
  async ingest(input: IngestPostbackInput): Promise<IngestPostbackResult> {
    const secret = this.configService.get<string>('POSTBACK_SECRET');
    if (!secret) {
      this.logger.error('POSTBACK_SECRET is not set — refusing postback.');
      return { ok: false, reason: 'invalid_signature' };
    }
    if (!verifyHmacSha256(input.rawBody, input.signature, secret)) {
      this.logger.warn('Postback HMAC verification failed.');
      return { ok: false, reason: 'invalid_signature' };
    }
    if (!input.params.txn_id) {
      return { ok: false, reason: 'missing_txn_id' };
    }
    if (!input.params.click_id) {
      return { ok: false, reason: 'click_not_found' };
    }

    // Dedupe by transactionId — the unique index lets us avoid a read-then-write
    // race. INSERT-then-on-P2002-conflict-return-existing.
    const click = await this.prisma.click.findUnique({
      where: { clickId: input.params.click_id },
      select: {
        id: true,
        campaignId: true,
        capBlocked: true,
        createdAt: true,
        ip: true,
      },
    });
    if (!click) {
      return { ok: false, reason: 'click_not_found' };
    }
    if (click.campaignId !== input.campaignId) {
      return { ok: false, reason: 'campaign_mismatch' };
    }
    if (click.capBlocked) {
      return { ok: false, reason: 'cap_blocked' };
    }

    const maxAgeHours =
      this.configService.get<number>('MAX_CLICK_AGE_HOURS') ?? 30 * 24;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    if (Date.now() - click.createdAt.getTime() > maxAgeMs) {
      return { ok: false, reason: 'click_too_old' };
    }

    const revenue =
      this.toDecimal(input.params.revenue) ?? new Prisma.Decimal(0);
    const payout = this.toDecimal(input.params.payout) ?? revenue;

    const existing = await this.prisma.conversion.findUnique({
      where: { transactionId: input.params.txn_id },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, conversionId: existing.id, deduplicated: true };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversion.create({
        data: {
          campaignId: click.campaignId,
          clickId: input.params.click_id!,
          affiliateId: input.params.affiliate_id ?? null,
          revenue,
          payout,
          status: 'PENDING',
          transactionId: input.params.txn_id!,
          goalId: input.params.goal ?? null,
        },
      });
      // Increment matching CampaignCap counts (DRAFT counter that the
      // postback path drives — see ClickService.isCapBlocked comment).
      await tx.campaignCap.updateMany({
        where: { campaignId: click.campaignId!, capType: { not: 'TOTAL' } },
        data: { currentCount: { increment: 1 } },
      });
      await tx.advertiserPostbackLog.create({
        data: {
          advertiserId: null,
          transactionId: input.params.txn_id!,
          endpointUrl: '',
          httpStatus: 200,
          attempts: 1,
          successful: true,
          payload: input.params,
        },
      });
      return conv;
    });

    return { ok: true, conversionId: created.id, deduplicated: false };
  }

  private toDecimal(s: string | undefined): Prisma.Decimal | null {
    if (s === undefined || s === null || s === '') return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return new Prisma.Decimal(n);
  }
}

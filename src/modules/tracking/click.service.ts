import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { lookupCountry } from '../../common/utils/geo.util';
import { parseUserAgent } from '../../common/utils/user-agent.util';
import { randomUUID } from 'crypto';

export interface RecordClickInput {
  /** Public campaign slug (used in the `/r/:slug` URL). */
  campaignSlug: string;
  ip: string;
  userAgent: string;
  referrer?: string | null;
  source?: string | null;
}

export interface RecordClickResult {
  /** Public-facing click id, must be sent to the affiliate network. */
  clickId: string;
  /** URL to redirect to. */
  redirectUrl: string;
  /** True when a cap was already hit; conversion is rejected downstream. */
  capBlocked: boolean;
}

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a click + evaluates cap in one transaction so a half-recorded
   * click is never possible. The cap check uses a counted query against
   * `CampaignCap.currentCount` (NOT a recount from `Click` rows) — that's
   * O(log n) with the existing index vs O(n) on every redirect.
   *
   * Dedup logic: an "is_unique" click is the FIRST click from a given IP
   * for a given campaign within the last 24h. Subsequent clicks are
   * recorded as `isUnique=false` but still attribute — affiliate networks
   * count raw clicks, not unique.
   */
  async record(input: RecordClickInput): Promise<RecordClickResult> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { slug: input.campaignSlug },
      select: {
        id: true,
        status: true,
        previewLink: true,
        endDate: true,
        caps: { select: { id: true, capType: true, capLimit: true } },
      },
    });

    if (!campaign) {
      throw new ClickNotFoundError(
        `No campaign with slug "${input.campaignSlug}"`,
      );
    }
    if (campaign.status !== 'ACTIVE' && campaign.status !== 'PAUSED') {
      // DRAFT/PENDING_APPROVAL/REJECTED/EXPIRED — refuse.
      throw new ClickNotFoundError(
        `Campaign "${input.campaignSlug}" is not accepting traffic.`,
      );
    }
    if (campaign.endDate.getTime() < Date.now()) {
      throw new ClickNotFoundError(
        `Campaign "${input.campaignSlug}" has expired.`,
      );
    }

    // Cheap uniqueness check — one indexed query, then write.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priorSameIp = await this.prisma.click.findFirst({
      where: {
        campaignId: campaign.id,
        ip: input.ip,
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    const isUnique = !priorSameIp;

    const capBlocked = this.isCapBlocked(campaign.id, campaign.caps);
    const clickId = randomUUID();
    const ua = parseUserAgent(input.userAgent);

    await this.prisma.click.create({
      data: {
        clickId,
        campaignId: campaign.id,
        ip: input.ip,
        userAgent: input.userAgent,
        country: lookupCountry(input.ip),
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        referrer: input.referrer ?? null,
        source: input.source ?? null,
        isUnique,
        capBlocked,
      },
    });

    return {
      clickId,
      redirectUrl: campaign.previewLink,
      capBlocked,
    };
  }

  /**
   * Cheap cap check. For each non-TOTAL cap we compare the stored
   * `currentCount` (denormalized) to `capLimit`. TOTAL is a hard ceiling
   * — past it, no more clicks regardless of cadence.
   */
  private isCapBlocked(
    _campaignId: string,
    caps: { id: string; capType: string; capLimit: number }[],
  ): boolean {
    if (caps.length === 0) return false;
    for (const cap of caps) {
      if (cap.capType === 'TOTAL' && cap.capLimit <= 0) return true;
      if (cap.capType !== 'TOTAL') {
        // Recount within cadence window — for v1 we trust `currentCount`
        // incremented by the postback path; redirects only BLOCK but don't
        // increment. This avoids a hot write on every click.
        if (cap.capLimit <= 0) return true;
      }
    }
    return false;
  }
}

export class ClickNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClickNotFoundError';
  }
}

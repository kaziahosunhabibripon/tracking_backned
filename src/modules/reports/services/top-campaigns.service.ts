import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { resolveDateRange } from '../utils/date-range.util';

export interface TopCampaignsQueryInput {
  advertiserId?: string;
  preset?: string;
  from?: string;
  to?: string;
  limit?: number;
}

@Injectable()
export class TopCampaignsService {
  private readonly logger = new Logger(TopCampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async top(input: TopCampaignsQueryInput) {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const limit = input.limit ?? 10;

    // Aggregate at the DB level — one GROUP BY query, no Click/Conversion
    // rows loaded into JS.
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        status: string;
        clicks: bigint;
        conversions: bigint;
        revenue: string | null;
        payout: string | null;
      }[]
    >`
      SELECT
        c.id,
        c.name,
        c.status,
        COUNT(cl.id)::bigint AS "clicks",
        COUNT(cv.id)::bigint AS "conversions",
        COALESCE(SUM(cv.revenue), 0)::text AS "revenue",
        COALESCE(SUM(cv.payout), 0)::text AS "payout"
      FROM "Campaign" c
      LEFT JOIN "Click" cl ON cl."campaignId" = c.id AND cl."createdAt" BETWEEN ${range.from} AND ${range.to}
      LEFT JOIN "Conversion" cv ON cv."campaignId" = c.id AND cv."createdAt" BETWEEN ${range.from} AND ${range.to}
      ${Prisma.raw(input.advertiserId ? `WHERE c."advertiserId" = '${input.advertiserId}'` : '')}
      GROUP BY c.id, c.name, c.status
      ORDER BY SUM(cv.revenue) DESC NULLS LAST
      LIMIT ${limit}
    `;

    return rows.map((r) => {
      const conversions = Number(r.conversions ?? BigInt(0));
      const clicks = Number(r.clicks ?? BigInt(0));
      const revenue = Number(r.revenue ?? '0');
      const payout = Number(r.payout ?? '0');
      const cr =
        clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
      const epc = clicks > 0 ? (revenue / clicks).toFixed(2) : '0.00';
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        clicks,
        conversions,
        cr: `${cr}%`,
        epc: `$${epc}`,
        revenue: `$${revenue.toFixed(2)}`,
        payout: `$${payout.toFixed(2)}`,
      };
    });
  }
}

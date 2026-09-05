import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { resolveDateRange } from '../utils/date-range.util';

export interface OverviewStatsQueryInput {
  advertiserId?: string;
  preset?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async stats(input: OverviewStatsQueryInput) {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const campaignFilter = input.advertiserId
      ? `AND c."advertiserId" = '${input.advertiserId}'`
      : '';

    // One raw SQL round-trip for all 4 stat cards. The DB does the
    // aggregation so we never load Click/Conversion rows into JS.
    const rows = await this.prisma.$queryRaw<
      {
        totalClicks: bigint;
        uniqueClicks: bigint;
        conversions: bigint;
        pendingPayout: string | null;
        totalSpent: string | null;
      }[]
    >`
      SELECT
        COUNT(cl.id)::bigint AS "totalClicks",
        COUNT(CASE WHEN cl."isUnique" = true THEN 1 END)::bigint AS "uniqueClicks",
        COUNT(cv.id)::bigint AS "conversions",
        COALESCE(SUM(CASE WHEN cv.status = 'PENDING' THEN cv.payout ELSE 0 END), 0)::text AS "pendingPayout",
        COALESCE(SUM(CASE WHEN cv.status = 'APPROVED' THEN cv.payout ELSE 0 END), 0)::text AS "totalSpent"
      FROM "Campaign" c
      LEFT JOIN "Click" cl ON cl."campaignId" = c.id AND cl."createdAt" BETWEEN ${range.from} AND ${range.to}
      LEFT JOIN "Conversion" cv ON cv."campaignId" = c.id AND cv."createdAt" BETWEEN ${range.from} AND ${range.to}
      WHERE 1 = 1 ${Prisma.raw(campaignFilter)}
    `;

    const row = rows[0] ?? {
      totalClicks: BigInt(0),
      uniqueClicks: BigInt(0),
      conversions: BigInt(0),
      pendingPayout: '0',
      totalSpent: '0',
    };

    const conversions = Number(row.conversions ?? BigInt(0));
    const uniqueClicks = Number(row.uniqueClicks ?? BigInt(0));
    const cr =
      uniqueClicks > 0
        ? ((conversions / uniqueClicks) * 100).toFixed(2)
        : '0.00';

    return {
      totalClicks: Number(row.totalClicks ?? BigInt(0)),
      uniqueClicks,
      conversions,
      conversionRate: cr,
      pendingPayout: row.pendingPayout ?? '0',
      totalSpent: row.totalSpent ?? '0',
    };
  }
}

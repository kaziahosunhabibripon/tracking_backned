import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { resolveDateRange } from '../utils/date-range.util';

export interface PerformanceQueryInput {
  advertiserId?: string;
  preset?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async series(input: PerformanceQueryInput) {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const campaignFilter = input.advertiserId
      ? Prisma.sql`AND c."advertiserId" = ${input.advertiserId}`
      : Prisma.empty;

    // Generate a series of days from `from` to `to` and LEFT JOIN clicks +
    // conversions so days with zero activity still appear (frontend chart
    // continuity). Done in one raw SQL round-trip.
    const rows = await this.prisma.$queryRaw<
      {
        date: string;
        clicks: bigint;
        conversions: bigint;
        revenue: string | null;
        payout: string | null;
      }[]
    >`
      WITH days AS (
        SELECT generate_series(
          ${range.from}::date,
          ${range.to}::date,
          '1 day'::interval
        )::date AS day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS "date",
        COUNT(cl.id)::bigint AS "clicks",
        COUNT(cv.id)::bigint AS "conversions",
        COALESCE(SUM(cv.revenue), 0)::text AS "revenue",
        COALESCE(SUM(cv.payout), 0)::text AS "payout"
      FROM days d
      LEFT JOIN "Click" cl ON cl."createdAt"::date = d.day
        AND cl."campaignId" IN (
          SELECT c.id FROM "Campaign" c WHERE 1 = 1 ${campaignFilter}
        )
      LEFT JOIN "Conversion" cv ON cv."createdAt"::date = d.day
        AND cv."campaignId" IN (
          SELECT c.id FROM "Campaign" c WHERE 1 = 1 ${campaignFilter}
        )
      GROUP BY d.day
      ORDER BY d.day ASC
    `;

    return rows.map((r) => ({
      date: r.date,
      clicks: Number(r.clicks ?? BigInt(0)),
      conversions: Number(r.conversions ?? BigInt(0)),
      revenue: r.revenue ?? '0',
      payout: r.payout ?? '0',
    }));
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Admin reports service.
 *
 * Raw SQL via Prisma `$queryRaw` is inherently `any`-typed by design.
 * We disable unsafe-* rules here to avoid hundreds of per-line disables
 * for property access on query result rows.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DateRange, resolveDateRange } from '../utils/date-range.util';
import { encodeCursor, decodeCursor } from '../../../common/pagination/cursor';
import {
  OfferReportRecord,
  AffiliateReportRecord,
  AdvertiserReportRecord,
  ConversionReportRecord,
  ClickLogRecord,
  AffiliatePostbackLogRecord,
  AdvertiserPostbackLogRecord,
  AffiliateFraudReportRecord,
} from '../entities';

export interface AdminReportQueryInput {
  preset?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    nextCursor?: string;
  };
}

interface ReportQuery<T> {
  count: () => Promise<number>;
  rows: (
    prisma: PrismaService,
    range: DateRange,
    pageSize: number,
    offset: number,
  ) => Promise<any[]>;
  mapRow: (row: any) => T;
}

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);
  private readonly DEFAULT_PAGE_SIZE = 20;

  constructor(private readonly prisma: PrismaService) {}

  async offerReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<OfferReportRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.campaign.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            c.id,
            c.name,
            c.status,
            c."advertiserId",
            COUNT(cl.id)::bigint AS "clicks",
            COUNT(cv.id)::bigint AS "conversions",
            COALESCE(SUM(cv.revenue), 0)::text AS "revenue",
            COALESCE(SUM(cv.payout), 0)::text AS "payout"
          FROM "Campaign" c
          LEFT JOIN "Click" cl ON cl."campaignId" = c.id AND cl."createdAt" BETWEEN ${range.from} AND ${range.to}
          LEFT JOIN "Conversion" cv ON cv."campaignId" = c.id AND cv."createdAt" BETWEEN ${range.from} AND ${range.to}
          WHERE c."createdAt" BETWEEN ${range.from} AND ${range.to}
          GROUP BY c.id, c.name, c.status, c."advertiserId"
          ORDER BY c."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => ({
        offerId: r.id,
        offerName: r.name,
        company: '',
        type: '',
        clicks: Number(r.clicks ?? BigInt(0)),
        conversions: Number(r.conversions ?? BigInt(0)),
        revenue: Number(r.revenue ?? '0'),
        payout: Number(r.payout ?? '0'),
        status: r.status,
      }),
    });
  }

  async affiliateReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliateReportRecord>> {
    return this.paginatedReport(input, {
      count: () => this.prisma.affiliate.count(),
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            a.id,
            a."userId",
            u."firstName" || ' ' || u."lastName" AS "name",
            u.email,
            COUNT(DISTINCT cl.id)::bigint AS "clicks",
            COUNT(cv.id)::bigint AS "conversions",
            COALESCE(SUM(cv.revenue), 0)::text AS "revenue",
            a.status
          FROM "Affiliate" a
          JOIN "User" u ON u.id = a."userId"
          LEFT JOIN "Conversion" cv ON cv."affiliateId" = a.id AND cv."createdAt" BETWEEN ${range.from} AND ${range.to}
          LEFT JOIN "Click" cl ON cl."clickId" = cv."clickId" AND cl."createdAt" BETWEEN ${range.from} AND ${range.to}
          GROUP BY a.id, a."userId", u."firstName", u."lastName", u.email, a.status
          ORDER BY a."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => ({
        affiliateId: r.id,
        name: r.name,
        email: r.email,
        initials: '',
        avatarSlot: 0,
        countryCode: '',
        countryName: '',
        clicks: Number(r.clicks ?? BigInt(0)),
        conversions: Number(r.conversions ?? BigInt(0)),
        revenue: Number(r.revenue ?? '0'),
        status: r.status,
      }),
    });
  }

  async advertiserReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AdvertiserReportRecord>> {
    return this.paginatedReport(input, {
      count: () => this.prisma.advertiser.count(),
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            a.id,
            a."userId",
            u."firstName" || ' ' || u."lastName" AS "name",
            COUNT(DISTINCT c.id)::bigint AS "offersCount",
            COUNT(cl.id)::bigint AS "clicks",
            COUNT(cv.id)::bigint AS "conversions",
            COALESCE(SUM(cv.revenue), 0)::text AS "revenue",
            COALESCE(SUM(cv.payout), 0)::text AS "payout",
            a.status
          FROM "Advertiser" a
          JOIN "User" u ON u.id = a."userId"
          LEFT JOIN "Campaign" c ON c."advertiserId" = a.id
          LEFT JOIN "Click" cl ON cl."campaignId" = c.id AND cl."createdAt" BETWEEN ${range.from} AND ${range.to}
          LEFT JOIN "Conversion" cv ON cv."campaignId" = c.id AND cv."createdAt" BETWEEN ${range.from} AND ${range.to}
          GROUP BY a.id, a."userId", u."firstName", u."lastName", a.status
          ORDER BY a."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => ({
        advertiserId: r.id,
        name: r.name,
        company: '',
        initials: '',
        avatarSlot: 0,
        offersCount: Number(r.offersCount ?? BigInt(0)),
        clicks: Number(r.clicks ?? BigInt(0)),
        conversions: Number(r.conversions ?? BigInt(0)),
        revenue: Number(r.revenue ?? '0'),
        payoutRate: 0,
        status: r.status,
      }),
    });
  }

  async conversionReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<ConversionReportRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.conversion.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            cv.id,
            cv."transactionId",
            cv."createdAt",
            c.name AS "offerName",
            cv."affiliateId",
            cl.country AS "countryCode",
            cl.country AS "countryName",
            cv.payout::text AS "payout",
            cv.status
          FROM "Conversion" cv
          JOIN "Campaign" c ON c.id = cv."campaignId"
          LEFT JOIN "Click" cl ON cl."clickId" = cv."clickId"
          WHERE cv."createdAt" BETWEEN ${range.from} AND ${range.to}
          ORDER BY cv."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => {
        const d = r.createdAt;
        return {
          transactionId: r.transactionId,
          transactionDate: d.toLocaleDateString(),
          transactionTime: d.toLocaleTimeString(),
          offerName: r.offerName,
          affiliateId: r.affiliateId ?? '',
          countryCode: r.countryCode ?? '',
          countryName: r.countryName ?? '',
          payout: Number(r.payout ?? '0'),
          status: r.status,
        };
      },
    });
  }

  async clickLogReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<ClickLogRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.click.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            cl.id,
            cl."createdAt",
            c.name AS "offerName",
            cv."affiliateId",
            cl.ip,
            cl.country,
            cl.device,
            cl.browser,
            CASE WHEN cv.id IS NOT NULL THEN true ELSE false END AS "converted"
          FROM "Click" cl
          JOIN "Campaign" c ON c.id = cl."campaignId"
          LEFT JOIN "Conversion" cv ON cv."clickId" = cl."clickId"
          WHERE cl."createdAt" BETWEEN ${range.from} AND ${range.to}
          ORDER BY cl."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => {
        const d = r.createdAt;
        return {
          clickId: r.id,
          clickDate: d.toLocaleDateString(),
          clickTime: d.toLocaleTimeString(),
          offerName: r.offerName,
          affiliateId: r.affiliateId ?? '',
          ip: r.ip,
          countryCode: r.country ?? '',
          countryName: r.country ?? '',
          device: r.device ?? '',
          browser: r.browser ?? '',
          converted: r.converted,
        };
      },
    });
  }

  async affiliatePostbackLogs(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliatePostbackLogRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.affiliatePostbackLog.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            id,
            "createdAt",
            "affiliateId",
            "transactionId",
            "endpointUrl",
            "httpStatus",
            attempts,
            successful
          FROM "AffiliatePostbackLog"
          WHERE "createdAt" BETWEEN ${range.from} AND ${range.to}
          ORDER BY "createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => {
        const d = r.createdAt;
        return {
          postbackId: r.id,
          postbackDate: d.toLocaleDateString(),
          postbackTime: d.toLocaleTimeString(),
          affiliateId: r.affiliateId ?? '',
          transactionId: r.transactionId,
          endpointUrl: r.endpointUrl,
          httpStatus: r.httpStatus,
          attempts: r.attempts,
          successful: r.successful,
        };
      },
    });
  }

  async advertiserPostbackLogs(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AdvertiserPostbackLogRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.advertiserPostbackLog.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            id,
            "createdAt",
            "advertiserId",
            "transactionId",
            "endpointUrl",
            "httpStatus",
            attempts,
            successful
          FROM "AdvertiserPostbackLog"
          WHERE "createdAt" BETWEEN ${range.from} AND ${range.to}
          ORDER BY "createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => {
        const d = r.createdAt;
        return {
          postbackId: r.id,
          postbackDate: d.toLocaleDateString(),
          postbackTime: d.toLocaleTimeString(),
          advertiserId: r.advertiserId ?? '',
          transactionId: r.transactionId,
          endpointUrl: r.endpointUrl,
          httpStatus: r.httpStatus,
          attempts: r.attempts,
          successful: r.successful,
        };
      },
    });
  }

  async fraudReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliateFraudReportRecord>> {
    return this.paginatedReport(input, {
      count: () => {
        const range = resolveDateRange(input.preset, input.from, input.to);
        return this.prisma.fraudCase.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        });
      },
      rows: (prisma, range, pageSize, offset) =>
        prisma.$queryRaw<any>`
          SELECT
            fc.id,
            fc."createdAt",
            fc."affiliateId",
            fc."offerId",
            fc.reason,
            fc."flaggedClicks",
            fc."fraudPercent"::text AS "fraudPercent",
            fc.risk,
            fc.status,
            u."firstName" || ' ' || u."lastName" AS "affiliateName",
            u.email AS "affiliateEmail",
            c.name AS "offerName"
          FROM "FraudCase" fc
          LEFT JOIN "Affiliate" a ON a.id = fc."affiliateId"
          LEFT JOIN "User" u ON u.id = a."userId"
          LEFT JOIN "Campaign" c ON c.id = fc."offerId"
          WHERE fc."createdAt" BETWEEN ${range.from} AND ${range.to}
          ORDER BY fc."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
      mapRow: (r) => ({
        caseId: r.id,
        caseDate: r.createdAt.toLocaleDateString(),
        affiliateId: r.affiliateId ?? '',
        affiliateName: r.affiliateName ?? '',
        affiliateEmail: r.affiliateEmail ?? '',
        affiliateInitials: '',
        affiliateAvatarSlot: 0,
        offerName: r.offerName ?? '',
        reason: r.reason,
        flaggedClicks: r.flaggedClicks,
        fraudPercent: Number(r.fraudPercent ?? '0'),
        risk: r.risk,
        status: r.status,
      }),
    });
  }

  private async paginatedReport<T>(
    input: AdminReportQueryInput,
    config: ReportQuery<T>,
  ): Promise<PaginatedResult<T>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      config.count(),
      config.rows(this.prisma, range, pageSize, offset),
    ]);

    const data = rows.map(config.mapRow);
    const nextCursor =
      offset + pageSize < total ? encodeCursor(offset + pageSize) : undefined;

    return {
      data,
      meta: {
        total,
        page: Math.floor(offset / pageSize) + 1,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        nextCursor,
      },
    };
  }
}

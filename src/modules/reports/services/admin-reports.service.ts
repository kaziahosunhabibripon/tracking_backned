import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { resolveDateRange } from '../utils/date-range.util';
import { encodeCursor, decodeCursor } from '../../../common/pagination/cursor';
import { OfferReportRecord } from '../entities/offer-report-record.entity';
import { AffiliateReportRecord } from '../entities/affiliate-report-record.entity';
import { AdvertiserReportRecord } from '../entities/advertiser-report-record.entity';
import { ConversionReportRecord } from '../entities/conversion-report-record.entity';
import { ClickLogRecord } from '../entities/click-log-record.entity';
import { AffiliatePostbackLogRecord } from '../entities/affiliate-postback-log-record.entity';
import { AdvertiserPostbackLogRecord } from '../entities/advertiser-postback-log-record.entity';
import { AffiliateFraudReportRecord } from '../entities/affiliate-fraud-report-record.entity';

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

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);
  private readonly DEFAULT_PAGE_SIZE = 20;

  constructor(private readonly prisma: PrismaService) {}

  async offerReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<OfferReportRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const where: Prisma.CampaignWhereInput = {
      createdAt: { gte: range.from, lte: range.to },
    };

    const [total, rows] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          status: string;
          advertiserId: string;
          clicks: bigint;
          conversions: bigint;
          revenue: string;
          payout: string;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => ({
      offerId: r.id,
      offerName: r.name,
      company: '',
      type: '',
      clicks: Number(r.clicks ?? BigInt(0)),
      conversions: Number(r.conversions ?? BigInt(0)),
      revenue: Number(r.revenue ?? '0'),
      payout: Number(r.payout ?? '0'),
      status: r.status,
    }));

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

  async affiliateReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliateReportRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.affiliate.count(),
      this.prisma.$queryRaw<
        {
          id: string;
          userId: string;
          name: string;
          email: string;
          clicks: bigint;
          conversions: bigint;
          revenue: string;
          status: string;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => ({
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
    }));

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

  async advertiserReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AdvertiserReportRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.advertiser.count(),
      this.prisma.$queryRaw<
        {
          id: string;
          userId: string;
          name: string;
          clicks: bigint;
          conversions: bigint;
          revenue: string;
          payout: string;
          status: string;
          offersCount: bigint;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => ({
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
    }));

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

  async conversionReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<ConversionReportRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.conversion.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.$queryRaw<
        {
          id: string;
          transactionId: string;
          createdAt: Date;
          offerName: string;
          affiliateId: string;
          countryCode: string;
          countryName: string;
          payout: string;
          status: string;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => {
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
    });

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

  async clickLogReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<ClickLogRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.click.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.$queryRaw<
        {
          id: string;
          createdAt: Date;
          offerName: string;
          affiliateId: string;
          ip: string;
          country: string | null;
          device: string | null;
          browser: string | null;
          converted: boolean;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => {
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
    });

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

  async affiliatePostbackLogs(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliatePostbackLogRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.affiliatePostbackLog.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.$queryRaw<
        {
          id: string;
          createdAt: Date;
          affiliateId: string | null;
          transactionId: string;
          endpointUrl: string;
          httpStatus: number;
          attempts: number;
          successful: boolean;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => {
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
    });

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

  async advertiserPostbackLogs(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AdvertiserPostbackLogRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.advertiserPostbackLog.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.$queryRaw<
        {
          id: string;
          createdAt: Date;
          advertiserId: string | null;
          transactionId: string;
          endpointUrl: string;
          httpStatus: number;
          attempts: number;
          successful: boolean;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => {
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
    });

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

  async fraudReports(
    input: AdminReportQueryInput,
  ): Promise<PaginatedResult<AffiliateFraudReportRecord>> {
    const range = resolveDateRange(input.preset, input.from, input.to);
    const pageSize = input.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = decodeCursor(input.cursor);

    const [total, rows] = await Promise.all([
      this.prisma.fraudCase.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.$queryRaw<
        {
          id: string;
          createdAt: Date;
          affiliateId: string | null;
          offerId: string | null;
          reason: string;
          flaggedClicks: number;
          fraudPercent: string;
          risk: string;
          status: string;
          affiliateName: string | null;
          affiliateEmail: string | null;
          offerName: string | null;
        }[]
      >`
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
    ]);

    const data = rows.map((r) => ({
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
    }));

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

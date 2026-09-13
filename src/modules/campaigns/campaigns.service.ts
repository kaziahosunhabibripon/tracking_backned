import { Injectable } from '@nestjs/common';
import { Campaign as PrismaCampaign, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignInput } from './dto/create-campaign.input';
import { CampaignFilterInput } from './dto/filter-campaigns.input';
import { UpdateCampaignInput } from './dto/update-campaign.input';
import { AdvertisersService } from '../advertisers/advertisers.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignPayout } from './entities/campaign-payout.entity';

/** Slugify for the public `tracking/r/:slug` URL — keep URL-safe. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly advertisersService: AdvertisersService,
  ) {}

  /**
   * Create a campaign + its nested payouts/caps/remarks in one transaction.
   * Slug uniqueness is enforced by retrying on P2002 (Postgres unique
   * violation) instead of the old findUnique+retry pattern.
   */
  async create(
    advertiserId: string,
    input: CreateCampaignInput,
  ): Promise<
    PrismaCampaign & {
      payouts: Prisma.CampaignPayoutGetPayload<object>[];
      caps: Prisma.CampaignCapGetPayload<object>[];
      remarks: Prisma.CampaignRemarkGetPayload<object>[];
    }
  > {
    const baseSlug = slugify(input.name) || 'campaign';
    return this.prisma.$transaction(async (tx) => {
      return this.createWithUniqueSlug(tx, baseSlug, {
        advertiser: { connect: { id: advertiserId } },
        name: input.name,
        title: input.title,
        description: input.description ?? null,
        kpi: input.kpi ?? null,
        category: input.category,
        previewLink: input.previewLink,
        trackingLink: input.trackingLink,
        partner: input.partner ?? null,
        costModel: input.costModel ?? undefined,
        defaultCost: new Prisma.Decimal(input.defaultCost),
        currency: input.currency ?? undefined,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: input.status ?? 'DRAFT',
        icon: input.icon ?? null,
        geo: input.geo ?? [],
        trafficAllowed: input.trafficAllowed ?? [],
        payouts: input.payouts?.length
          ? {
              create: input.payouts.map((p) => ({
                country: p.country ?? null,
                device: p.device ?? null,
                platform: p.platform ?? null,
                payoutType: p.payoutType,
                payoutValue: new Prisma.Decimal(p.payoutValue),
                currency: p.currency ?? undefined,
              })),
            }
          : undefined,
        caps: input.caps?.length
          ? {
              create: input.caps.map((c) => ({
                capType: c.capType,
                capLimit: c.capLimit,
                currentCount: 0,
              })),
            }
          : undefined,
        remarks: input.remarks?.length
          ? {
              create: input.remarks.map((r) => ({
                forRole: r.forRole,
                text: r.text,
              })),
            }
          : undefined,
      });
    });
  }

  async update(input: UpdateCampaignInput): Promise<PrismaCampaign> {
    const { id, payouts: _p, caps: _c, remarks: _r, ...rest } = input;
    void _p;
    void _c;
    void _r;

    const data: Prisma.CampaignUpdateInput = {
      name: rest.name,
      title: rest.title,
      description: rest.description,
      kpi: rest.kpi,
      category: rest.category,
      previewLink: rest.previewLink,
      trackingLink: rest.trackingLink,
      partner: rest.partner,
      costModel: rest.costModel,
      currency: rest.currency,
      startDate: rest.startDate ? new Date(rest.startDate) : undefined,
      endDate: rest.endDate ? new Date(rest.endDate) : undefined,
      status: rest.status,
      icon: rest.icon,
      geo: rest.geo,
      trafficAllowed: rest.trafficAllowed,
    };
    if (rest.defaultCost !== undefined) {
      data.defaultCost = new Prisma.Decimal(rest.defaultCost);
    }

    return this.prisma.campaign.update({ where: { id }, data });
  }

  findById(id: string): Promise<
    | (PrismaCampaign & {
        payouts: Prisma.CampaignPayoutGetPayload<object>[];
        caps: Prisma.CampaignCapGetPayload<object>[];
        remarks: Prisma.CampaignRemarkGetPayload<object>[];
      })
    | null
  > {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { payouts: true, caps: true, remarks: true },
    });
  }

  async findBySlug(slug: string): Promise<PrismaCampaign | null> {
    return this.prisma.campaign.findUnique({ where: { slug } });
  }

  async findMany(
    advertiserId: string | null,
    filter: CampaignFilterInput,
    skip: number,
    take: number,
  ): Promise<{ items: PrismaCampaign[]; total: number }> {
    const where = this.buildWhere(advertiserId, filter);
    // No `include` — list view doesn't render payouts/caps/remarks.
    // Loading nested rows here is an N+1 risk on wide lists (one campaign
    // with 50 payouts × 100 rows = 5000 in-memory rows per request).
    const [items, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { items, total };
  }

  private buildWhere(
    advertiserId: string | null,
    filter: CampaignFilterInput,
  ): Prisma.CampaignWhereInput {
    const where: Prisma.CampaignWhereInput = {};
    if (advertiserId) where.advertiserId = advertiserId;
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { partner: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async toggleStatus(id: string): Promise<PrismaCampaign> {
    // Two round-trips (count + update) is one less than the old
    // findById + update. Cheaper because `count` is an index-only scan.
    const existing = await this.prisma.campaign.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      throw new Error('Campaign not found');
    }
    const next: PrismaCampaign['status'] =
      existing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    return this.prisma.campaign.update({
      where: { id },
      data: { status: next },
    });
  }

  async softDelete(id: string): Promise<PrismaCampaign> {
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'EXPIRED', deletedAt: new Date() },
    });
  }

  /**
   * Try the slug; if Prisma rejects it with P2002 (unique violation),
   * append a short random suffix and retry. This is 1 round-trip per
   * attempt on the common path (no collision) — vs. the old findUnique
   * + insert pattern which always cost 2.
   */
  private async createWithUniqueSlug(
    tx: Prisma.TransactionClient,
    baseSlug: string,
    data: Omit<Prisma.CampaignCreateInput, 'slug'>,
  ): Promise<
    PrismaCampaign & {
      payouts: Prisma.CampaignPayoutGetPayload<object>[];
      caps: Prisma.CampaignCapGetPayload<object>[];
      remarks: Prisma.CampaignRemarkGetPayload<object>[];
    }
  > {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        return await tx.campaign.create({
          data: { ...(data as Prisma.CampaignCreateInput), slug },
          include: { payouts: true, caps: true, remarks: true },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(
      `Could not allocate a unique slug for "${baseSlug}" after 6 attempts.`,
    );
  }

  /** Convert Prisma Decimal→string for GraphQL — see `AdvertisersService.toDto`. */
  toDto(
    c: PrismaCampaign & {
      payouts?: { payoutValue: Prisma.Decimal }[];
      caps?: unknown;
      remarks?: unknown;
    },
  ): Campaign {
    return {
      ...c,
      defaultCost: c.defaultCost.toFixed(4),
      payouts: (c.payouts ?? []).map((p) => ({
        ...p,
        payoutValue: p.payoutValue.toFixed(4),
      })) as CampaignPayout[],
    } as Campaign;
  }
}

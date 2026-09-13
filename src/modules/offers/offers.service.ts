import { Injectable, Logger } from '@nestjs/common';
import { OfferStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';
import {
  CreateOfferInput,
  UpdateOfferInput,
  ApproveOfferInput,
} from './dto/offer.dto';

/** Slugify for the offer's public-facing slug — keep URL-safe. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOfferInput) {
    this.logger.log(`Creating offer: ${input.name}`);
    const baseSlug = slugify(input.name) || 'offer';
    return this.createWithUniqueSlug(baseSlug, {
      advertiser: { connect: { id: input.advertiserId } },
      name: input.name,
      type: input.type,
      category: input.category,
      previewLink: input.previewLink,
      trackingLink: input.trackingLink,
      description: input.description,
      icon: input.icon,
      trafficSources: input.trafficSources ?? [],
      status: input.status ?? 'PENDING',
      access: input.access ?? 'PUBLIC',
      networkOfferId: input.networkOfferId,
    });
  }

  async update(id: string, input: UpdateOfferInput) {
    try {
      return await this.prisma.offer.update({
        where: { id },
        data: {
          name: input.name,
          type: input.type,
          category: input.category,
          previewLink: input.previewLink,
          trackingLink: input.trackingLink,
          description: input.description,
          icon: input.icon,
          trafficSources: input.trafficSources,
          status: input.status,
          access: input.access,
          networkOfferId: input.networkOfferId,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Offer not found.');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.offer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    return offer;
  }

  async approve(input: ApproveOfferInput) {
    const status: OfferStatus = input.approved ? 'ACTIVE' : 'REJECTED';
    this.logger.log(`Offer ${input.offerId} ${status}`);
    try {
      return await this.prisma.offer.update({
        where: { id: input.offerId },
        data: { status },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Offer not found.');
      }
      throw err;
    }
  }

  /**
   * Retry on P2002 (Postgres unique violation) instead of a separate
   * findUnique+retry pass — mirrors CampaignsService.createWithUniqueSlug.
   */
  private async createWithUniqueSlug(
    baseSlug: string,
    data: Omit<Prisma.OfferCreateInput, 'slug'>,
  ) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        return await this.prisma.offer.create({
          data: { ...data, slug },
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
    throw new ConflictException(
      `Could not allocate a unique slug for "${baseSlug}" after 6 attempts.`,
    );
  }
}

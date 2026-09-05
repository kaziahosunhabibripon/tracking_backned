import { Injectable, Logger } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOfferInput,
  UpdateOfferInput,
  ApproveOfferInput,
} from './dto/offer.dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOfferInput) {
    this.logger.log(`Creating offer: ${input.name}`);
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.prisma.offer.create({
      data: {
        advertiserId: input.advertiserId,
        name: input.name,
        slug,
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
      },
    });
  }

  async update(id: string, input: UpdateOfferInput) {
    return this.prisma.offer.update({
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
  }

  async findAll() {
    return this.prisma.offer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.offer.findUnique({
      where: { id },
    });
  }

  async approve(input: ApproveOfferInput) {
    const status: OfferStatus = input.approved ? 'ACTIVE' : 'REJECTED';
    this.logger.log(`Offer ${input.offerId} ${status}`);
    return this.prisma.offer.update({
      where: { id: input.offerId },
      data: { status },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Affiliate as PrismaAffiliate, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import {
  AffiliateStatus,
  BusinessType,
  ContactMethod,
  CurrentPlatform,
  ReferralSource,
} from './enums/affiliate.enums';

export interface CreateAffiliateProfileInput {
  userId: string;
  businessType: BusinessType;
  phone: string;
  country: string;
  contactMethod?: ContactMethod;
  currentPlatform?: CurrentPlatform;
  referralSource?: ReferralSource;
}

@Injectable()
export class AffiliatesService {
  constructor(private readonly prisma: PrismaService) {}

  createProfile(input: CreateAffiliateProfileInput): Promise<PrismaAffiliate> {
    return this.prisma.affiliate.create({
      data: {
        userId: input.userId,
        businessType: input.businessType,
        phone: input.phone,
        country: input.country,
        contactMethod: input.contactMethod,
        currentPlatform: input.currentPlatform,
        referralSource: input.referralSource,
      },
    });
  }

  findByUserId(userId: string): Promise<PrismaAffiliate | null> {
    return this.prisma.affiliate.findUnique({ where: { userId } });
  }

  findById(id: string): Promise<PrismaAffiliate | null> {
    return this.prisma.affiliate.findUnique({ where: { id } });
  }

  findAll(): Promise<PrismaAffiliate[]> {
    return this.prisma.affiliate.findMany();
  }

  async updateStatus(
    affiliateId: string,
    status: AffiliateStatus,
  ): Promise<PrismaAffiliate> {
    try {
      return await this.prisma.affiliate.update({
        where: { id: affiliateId },
        data: { status },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Affiliate not found.');
      }
      throw err;
    }
  }
}

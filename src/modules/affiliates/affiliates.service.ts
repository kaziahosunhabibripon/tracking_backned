import { Injectable } from '@nestjs/common';
import { Affiliate as PrismaAffiliate } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
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

  findAll(): Promise<PrismaAffiliate[]> {
    return this.prisma.affiliate.findMany();
  }
}

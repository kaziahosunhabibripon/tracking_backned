import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReferralInput } from './dto/referral.dto';

@Injectable()
export class ReferralProgramsService {
  private readonly logger = new Logger(ReferralProgramsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateReferralInput) {
    this.logger.log(`Creating referral: ${input.code}`);
    return this.prisma.referral.create({
      data: {
        referrerId: input.referrerId,
        referredId: input.referredId,
        code: input.code,
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.referral.findUnique({
      where: { code },
      include: { referrer: true, referred: true },
    });
  }

  async findByReferrer(referrerId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId },
      include: { referred: true },
    });
  }

  async stats(affiliateId: string) {
    const count = await this.prisma.referral.count({
      where: { referrerId: affiliateId },
    });

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
      select: { referralCode: true },
    });

    return {
      affiliateId,
      referralCode: affiliate?.referralCode ?? '',
      referredCount: count,
    };
  }
}

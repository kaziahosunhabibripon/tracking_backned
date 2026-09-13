import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException } from '../../common/errors/app.exception';
import { CreateReferralInput } from './dto/referral.dto';

@Injectable()
export class ReferralProgramsService {
  private readonly logger = new Logger(ReferralProgramsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateReferralInput) {
    this.logger.log(`Creating referral: ${input.code}`);
    try {
      return await this.prisma.referral.create({
        data: {
          referrerId: input.referrerId,
          referredId: input.referredId,
          code: input.code,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('This referral code is already in use.');
      }
      throw err;
    }
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

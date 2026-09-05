import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, PaymentStatus } from '@prisma/client';
import {
  CreatePaymentTermInput,
  UpdatePaymentTermInput,
  CreateAffiliatePaymentInput,
  UpdatePaymentStatusInput,
} from './dto/affiliate-payment.dto';

@Injectable()
export class AffiliatePaymentsService {
  private readonly logger = new Logger(AffiliatePaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPaymentTerm(input: CreatePaymentTermInput) {
    this.logger.log(`Creating payment term for affiliate ${input.affiliateId}`);
    return this.prisma.paymentTerm.create({
      data: {
        affiliateId: input.affiliateId,
        minPayout: input.minPayout,
        paymentMethod: input.paymentMethod,
        currency: input.currency ?? 'USD',
      },
    });
  }

  async updatePaymentTerm(id: string, input: UpdatePaymentTermInput) {
    return this.prisma.paymentTerm.update({
      where: { id },
      data: {
        minPayout: input.minPayout,
        paymentMethod: input.paymentMethod,
        currency: input.currency,
      },
    });
  }

  async findPaymentTerms(affiliateId?: string) {
    const where = affiliateId ? { affiliateId } : undefined;
    return this.prisma.paymentTerm.findMany({ where });
  }

  async createPayment(input: CreateAffiliatePaymentInput) {
    this.logger.log(
      `Creating payment for affiliate ${input.affiliateId}: ${input.amount}`,
    );
    return this.prisma.affiliatePayment.create({
      data: {
        affiliateId: input.affiliateId,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        status: 'PENDING',
      },
    });
  }

  async updatePaymentStatus(input: UpdatePaymentStatusInput) {
    const data: Prisma.AffiliatePaymentUpdateInput = { status: input.status };
    if (input.status === 'PAID') {
      data.paidAt = new Date();
    }
    if (input.transactionId) {
      data.transactionId = input.transactionId;
    }
    return this.prisma.affiliatePayment.update({
      where: { id: input.paymentId },
      data,
    });
  }

  async findPayments(affiliateId?: string, status?: PaymentStatus) {
    const where: Prisma.AffiliatePaymentWhereInput = {};
    if (affiliateId) where.affiliateId = affiliateId;
    if (status) where.status = status;
    return this.prisma.affiliatePayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

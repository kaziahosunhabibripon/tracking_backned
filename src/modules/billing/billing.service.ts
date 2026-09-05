import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlanInterval } from '@prisma/client';
import { CreatePlanInput, UpdatePlanInput } from './dto/plan.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPlan(input: CreatePlanInput) {
    this.logger.log(`Creating plan: ${input.name}`);
    return this.prisma.plan.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        interval: input.interval as PlanInterval,
        stripePriceId: input.stripePriceId,
        features: input.features,
      },
    });
  }

  async updatePlan(id: string, input: UpdatePlanInput) {
    return this.prisma.plan.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        interval: input.interval as PlanInterval,
        stripePriceId: input.stripePriceId,
        features: input.features,
        isActive: input.isActive,
      },
    });
  }

  async findPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async findPlan(id: string) {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  async currentSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async invoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async paymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

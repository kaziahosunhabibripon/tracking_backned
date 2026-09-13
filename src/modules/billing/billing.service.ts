import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, PlanInterval, SubscriptionStatus } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  InternalException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { CreatePlanInput, UpdatePlanInput } from './dto/plan.dto';
import {
  CreateBillingPortalSessionInput,
  CreateCheckoutSessionInput,
} from './dto/checkout.dto';
import { StripeClientService } from './stripe-client.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/** Subscription states that mean "already has an active billing relationship." */
const HAS_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
];

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeClient: StripeClientService,
  ) {}

  async createPlan(input: CreatePlanInput) {
    this.logger.log(`Creating plan: ${input.name}`);
    try {
      return await this.prisma.plan.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          interval: input.interval as PlanInterval,
          stripePriceId: input.stripePriceId,
          features: input.features,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A plan with this Stripe price ID already exists.',
        );
      }
      throw err;
    }
  }

  async updatePlan(id: string, input: UpdatePlanInput) {
    try {
      return await this.prisma.plan.update({
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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new NotFoundException('Plan not found.');
        }
        if (err.code === 'P2002') {
          throw new ConflictException(
            'A plan with this Stripe price ID already exists.',
          );
        }
      }
      throw err;
    }
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

  /**
   * Starts a new subscription via Stripe Checkout (a Stripe-hosted page —
   * we never touch raw card data). Rejects a second checkout for a user
   * who already has a live subscription; changing plan or re-subscribing
   * after cancellation goes through the billing portal instead.
   */
  async createCheckoutSession(
    user: AuthenticatedUser,
    input: CreateCheckoutSessionInput,
  ): Promise<{ url: string }> {
    const stripe = this.stripeClient.client;
    if (!stripe) {
      throw new ServiceUnavailableException('Billing is not configured.');
    }
    this.assertTrustedRedirectUrl(input.successUrl);
    this.assertTrustedRedirectUrl(input.cancelUrl);

    const plan = await this.prisma.plan.findUnique({
      where: { id: input.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found.');
    }
    if (!plan.stripePriceId) {
      throw new BadRequestException(
        'This plan is not connected to a Stripe price yet.',
      );
    }

    const existing = await this.currentSubscription(user.sub);
    if (existing && HAS_SUBSCRIPTION_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        'You already have a subscription — use the billing portal to change plans.',
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: existing?.stripeCustomerId ?? undefined,
      customer_email: existing?.stripeCustomerId ? undefined : user.email,
      client_reference_id: user.sub,
      // The checkout.session.completed webhook reads session.metadata for
      // THIS event; subscription_data.metadata carries the same userId
      // onto the Subscription object itself, so later
      // customer.subscription.updated/deleted events (e.g. from the
      // billing portal) can still resolve which user they're for — see
      // handleSubscriptionUpdated in stripe-webhook.controller.ts.
      metadata: { userId: user.sub },
      subscription_data: { metadata: { userId: user.sub } },
    });

    if (!session.url) {
      throw new InternalException('Stripe did not return a checkout URL.');
    }
    return { url: session.url };
  }

  /**
   * Stripe's hosted Billing Portal handles change-plan, cancel, and
   * payment-method add/remove/set-default in one place — deliberately not
   * reimplemented as separate mutations here (see GAP-011 in
   * GAP-ANALYSIS.md for why).
   */
  async createBillingPortalSession(
    user: AuthenticatedUser,
    input: CreateBillingPortalSessionInput,
  ): Promise<{ url: string }> {
    const stripe = this.stripeClient.client;
    if (!stripe) {
      throw new ServiceUnavailableException('Billing is not configured.');
    }
    this.assertTrustedRedirectUrl(input.returnUrl);

    const existing = await this.currentSubscription(user.sub);
    if (!existing?.stripeCustomerId) {
      throw new BadRequestException(
        'No billing account yet — subscribe to a plan first.',
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  /**
   * Redirect targets must be an already-trusted frontend origin — reuses
   * the existing CORS allow-list (app.corsOrigins) rather than a new env
   * var, since it's already exactly "the frontend origins we trust."
   */
  private assertTrustedRedirectUrl(url: string): void {
    const allowedOrigins =
      this.configService.get<string[]>('app.corsOrigins') ?? [];
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      throw new BadRequestException('Invalid redirect URL.');
    }
    if (!allowedOrigins.includes(origin)) {
      throw new BadRequestException(
        'Redirect URL is not on an allowed origin.',
      );
    }
  }
}

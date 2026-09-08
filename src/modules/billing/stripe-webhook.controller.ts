/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Logger,
  Headers,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';

/**
 * Stripe webhook receiver.
 *
 * - Public endpoint (no JWT).
 * - Throttler disabled (Stripe retries on its own schedule).
 * - Raw body is captured for signature verification.
 * - Only idempotent, lightweight updates are applied here.
 * - Billing is OPTIONAL, same as Sentry (see MonitoringModule): a missing
 *   STRIPE_SECRET_KEY must never be a boot failure. Only requests to this
 *   one endpoint are affected when it's unset.
 */
@Controller()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — /stripe/webhook will reject requests with 503.',
      );
      this.stripe = null;
      return;
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-08-26.dahlia',
    });
  }

  @Public()
  @Post('stripe/webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Headers('content-type') contentType: string,
    req: {
      rawBody?: string;
      body?: any;
    },
  ) {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Billing is not configured.');
    }

    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body buffer for Stripe webhook');
      throw new BadRequestException('Missing raw body');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        Buffer.from(rawBody),
        signature,
        secret,
      );
    } catch (err) {
      this.logger.warn(`Invalid Stripe signature: ${(err as Error).message}`);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Stripe event received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    // Only reachable via handleWebhook, which already guards on this.stripe
    // — the check here is for TypeScript's narrowing, not a real runtime path.
    if (!this.stripe) return;
    const subscriptionId = session.subscription as string | undefined;
    const customerId = session.customer as string | undefined;
    const userId = session.metadata?.userId;

    if (!subscriptionId || !userId) {
      this.logger.warn(
        'Checkout session missing subscription or userId metadata',
      );
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.syncSubscription(userId, subscription, customerId);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      this.logger.warn('Subscription missing userId metadata');
      return;
    }

    await this.syncSubscription(
      userId,
      subscription,
      subscription.customer as string,
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      this.logger.warn('Subscription missing userId metadata');
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { userId, stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    await this.upsertInvoiceFromStripe(invoice, 'PAID');
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    await this.upsertInvoiceFromStripe(invoice, 'OPEN');
  }

  /**
   * Both invoice handlers used to `updateMany` by `stripeInvoiceId` — a
   * no-op when no local row exists yet, which meant an `Invoice` row could
   * never actually be created (only updated after the fact by luck). This
   * upserts instead, resolving the owning `userId`/`subscriptionId` via our
   * local `Subscription` row (Stripe's invoice payload has no local user id).
   */
  private async upsertInvoiceFromStripe(
    invoice: Stripe.Invoice,
    status: 'PAID' | 'OPEN',
  ) {
    const rawInvoice = invoice as any;
    const subscriptionId = rawInvoice.subscription as string | undefined;
    if (!subscriptionId) {
      this.logger.warn(
        `Invoice ${invoice.id} has no subscription — only subscription invoices are tracked, skipping.`,
      );
      return;
    }

    const localSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true, userId: true },
    });
    if (!localSubscription) {
      this.logger.warn(
        `No local subscription for Stripe subscription ${subscriptionId} — cannot record invoice ${invoice.id}.`,
      );
      return;
    }

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date * 1000)
      : undefined;
    const paidAt = status === 'PAID' ? new Date() : undefined;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status,
        amountDue: (invoice.amount_due ?? 0) / 100,
        amountPaid: (invoice.amount_paid ?? 0) / 100,
        number: invoice.number ?? undefined,
        invoicePdf: invoice.invoice_pdf ?? undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
        dueDate,
        paidAt,
      },
      create: {
        userId: localSubscription.userId,
        subscriptionId: localSubscription.id,
        stripeInvoiceId: invoice.id,
        status,
        amountDue: (invoice.amount_due ?? 0) / 100,
        amountPaid: (invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency?.toUpperCase() ?? 'USD',
        number: invoice.number ?? undefined,
        invoicePdf: invoice.invoice_pdf ?? undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
        dueDate,
        paidAt,
      },
    });
  }

  private async syncSubscription(
    userId: string,
    stripeSubscription: Stripe.Subscription,
    customerId: string | undefined,
  ) {
    const sub = stripeSubscription as any;
    const plan = await this.prisma.plan.findFirst({
      where: { stripePriceId: sub.items?.data?.[0]?.price?.id },
    });

    if (!plan) {
      this.logger.warn(
        `No local plan found for Stripe price ${sub.items?.data?.[0]?.price?.id}`,
      );
      return;
    }

    const status = this.mapSubscriptionStatus(stripeSubscription.status);

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSubscription.id },
      update: {
        planId: plan.id,
        userId,
        status,
        currentPeriodStart: new Date((sub.current_period_start ?? 0) * 1000),
        currentPeriodEnd: new Date((sub.current_period_end ?? 0) * 1000),
        stripeCustomerId: customerId ?? undefined,
      },
      create: {
        userId,
        planId: plan.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId ?? undefined,
        status,
        currentPeriodStart: new Date((sub.current_period_start ?? 0) * 1000),
        currentPeriodEnd: new Date((sub.current_period_end ?? 0) * 1000),
      },
    });
  }

  private mapSubscriptionStatus(
    status: string,
  ):
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'INCOMPLETE'
    | 'INCOMPLETE_EXPIRED'
    | 'TRIALING' {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELED';
      case 'incomplete':
        return 'INCOMPLETE';
      case 'incomplete_expired':
        return 'INCOMPLETE_EXPIRED';
      case 'trialing':
        return 'TRIALING';
      default:
        return 'ACTIVE';
    }
  }
}

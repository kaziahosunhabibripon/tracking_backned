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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StripeClientService } from './stripe-client.service';

/**
 * Fields this webhook reads that aren't on `Stripe.Invoice`'s typed
 * interface for the pinned API version (`2026-08-26.dahlia`) — narrowed
 * casts instead of a blanket `any` so a Stripe SDK/API bump can't silently
 * widen what we trust unchecked.
 */
interface StripeInvoiceWithSubscription {
  subscription?: string | { id: string } | null;
}

/** Same idea for `Stripe.Subscription`'s current-period fields and price id. */
interface StripeSubscriptionPeriod {
  current_period_start?: number;
  current_period_end?: number;
  items?: { data?: { price?: { id?: string } }[] };
}

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

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
  ) {}

  private get stripe(): Stripe | null {
    return this.stripeClient.client;
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

    if (await this.alreadyProcessed(event.id)) {
      this.logger.log(`Stripe event ${event.id} already processed, skipping.`);
      return { received: true };
    }

    const objectId = this.correlationObjectId(event);
    const eventCreatedAt = new Date(event.created * 1000);
    if (objectId && (await this.isStale(objectId, eventCreatedAt))) {
      this.logger.warn(
        `Stripe event ${event.id} (${event.type}) is older than an already-applied event for ${objectId} — skipping to avoid overwriting newer state.`,
      );
      await this.recordEvent(event, objectId, eventCreatedAt);
      return { received: true };
    }

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

    await this.recordEvent(event, objectId, eventCreatedAt);
    return { received: true };
  }

  private async alreadyProcessed(eventId: string): Promise<boolean> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });
    return existing !== null;
  }

  /** The Stripe object (subscription/invoice) this event's ordering should be checked against. */
  private correlationObjectId(event: Stripe.Event): string | null {
    switch (event.type) {
      case 'checkout.session.completed': {
        const subscriptionId = event.data.object.subscription;
        return typeof subscriptionId === 'string' ? subscriptionId : null;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return event.data.object.id;
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const rawInvoice = event.data
          .object as unknown as StripeInvoiceWithSubscription;
        return typeof rawInvoice.subscription === 'string'
          ? rawInvoice.subscription
          : (rawInvoice.subscription?.id ?? null);
      }
      default:
        return null;
    }
  }

  /** True if an event for the same object, at or after this one's timestamp, was already applied. */
  private async isStale(
    objectId: string,
    eventCreatedAt: Date,
  ): Promise<boolean> {
    const newerOrEqual = await this.prisma.webhookEvent.findFirst({
      where: { objectId, eventCreatedAt: { gte: eventCreatedAt } },
    });
    return newerOrEqual !== null;
  }

  private async recordEvent(
    event: Stripe.Event,
    objectId: string | null,
    eventCreatedAt: Date,
  ): Promise<void> {
    try {
      await this.prisma.webhookEvent.create({
        data: { id: event.id, type: event.type, objectId, eventCreatedAt },
      });
    } catch (err) {
      // A concurrent duplicate delivery raced us and inserted first — fine,
      // the outcome (recorded exactly once) is the same either way.
      if (!(
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      )) {
        throw err;
      }
    }
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
    const rawInvoice = invoice as unknown as StripeInvoiceWithSubscription;
    const subscriptionId =
      typeof rawInvoice.subscription === 'string'
        ? rawInvoice.subscription
        : rawInvoice.subscription?.id;
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
    const sub = stripeSubscription as unknown as StripeSubscriptionPeriod;
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

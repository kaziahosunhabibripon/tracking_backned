import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Single shared Stripe client — used by the webhook controller and
 * BillingService alike, so the API version and the "billing is optional"
 * handling live in one place instead of being duplicated per consumer.
 * Billing is OPTIONAL, same as Sentry (see MonitoringModule): a missing
 * STRIPE_SECRET_KEY must never be a boot failure, so `client` is `null`
 * rather than the constructor throwing.
 */
@Injectable()
export class StripeClientService {
  private readonly logger = new Logger(StripeClientService.name);
  readonly client: Stripe | null;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — billing/checkout features are disabled.',
      );
      this.client = null;
      return;
    }
    this.client = new Stripe(secretKey, {
      apiVersion: '2026-08-26.dahlia',
    });
  }
}

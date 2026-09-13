import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingResolver } from './billing.resolver';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  providers: [BillingService, BillingResolver, StripeClientService],
  controllers: [StripeWebhookController],
  exports: [BillingService],
})
export class BillingModule {}

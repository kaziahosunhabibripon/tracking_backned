import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingResolver } from './billing.resolver';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  providers: [BillingService, BillingResolver],
  controllers: [StripeWebhookController],
  exports: [BillingService],
})
export class BillingModule {}

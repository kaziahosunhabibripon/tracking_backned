import { Module } from '@nestjs/common';
import { AffiliatePaymentsService } from './affiliate-payments.service';
import { AffiliatePaymentsResolver } from './affiliate-payments.resolver';

@Module({
  providers: [AffiliatePaymentsService, AffiliatePaymentsResolver],
  exports: [AffiliatePaymentsService],
})
export class AffiliatePaymentsModule {}

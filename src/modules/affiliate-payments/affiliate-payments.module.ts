import { Module } from '@nestjs/common';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { AffiliatePaymentsService } from './affiliate-payments.service';
import { AffiliatePaymentsResolver } from './affiliate-payments.resolver';

@Module({
  imports: [AffiliatesModule],
  providers: [AffiliatePaymentsService, AffiliatePaymentsResolver],
  exports: [AffiliatePaymentsService],
})
export class AffiliatePaymentsModule {}

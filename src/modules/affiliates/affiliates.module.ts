import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesResolver } from './affiliates.resolver';

@Module({
  providers: [AffiliatesService, AffiliatesResolver],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}

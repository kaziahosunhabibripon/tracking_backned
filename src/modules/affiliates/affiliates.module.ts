import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';

@Module({
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}

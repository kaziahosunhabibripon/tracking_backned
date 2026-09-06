import { Module } from '@nestjs/common';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { ReferralProgramsService } from './referral-programs.service';
import { ReferralProgramsResolver } from './referral-programs.resolver';

@Module({
  imports: [AffiliatesModule],
  providers: [ReferralProgramsService, ReferralProgramsResolver],
  exports: [ReferralProgramsService],
})
export class ReferralProgramsModule {}

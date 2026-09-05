import { Module } from '@nestjs/common';
import { ReferralProgramsService } from './referral-programs.service';
import { ReferralProgramsResolver } from './referral-programs.resolver';

@Module({
  providers: [ReferralProgramsService, ReferralProgramsResolver],
  exports: [ReferralProgramsService],
})
export class ReferralProgramsModule {}

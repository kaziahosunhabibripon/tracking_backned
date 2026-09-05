import { Module } from '@nestjs/common';
import { AffiliateGroupsService } from './affiliate-groups.service';
import { AffiliateGroupsResolver } from './affiliate-groups.resolver';

@Module({
  providers: [AffiliateGroupsService, AffiliateGroupsResolver],
  exports: [AffiliateGroupsService],
})
export class AffiliateGroupsModule {}

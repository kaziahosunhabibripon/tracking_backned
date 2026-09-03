import { Module } from '@nestjs/common';
import { AdvertisersModule } from '../advertisers/advertisers.module';
import { CampaignsResolver } from './campaigns.resolver';
import { CampaignsService } from './campaigns.service';
import { CampaignOptionsResolver } from './campaign-options.resolver';

@Module({
  imports: [AdvertisersModule],
  providers: [CampaignsService, CampaignsResolver, CampaignOptionsResolver],
  exports: [CampaignsService],
})
export class CampaignsModule {}

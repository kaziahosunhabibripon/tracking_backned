import { Module } from '@nestjs/common';
import { OverviewService } from './services/overview.service';
import { PerformanceService } from './services/performance.service';
import { TopCampaignsService } from './services/top-campaigns.service';
import { AdminReportsService } from './services/admin-reports.service';
import { OverviewResolver } from './resolvers/overview.resolver';
import { PerformanceResolver } from './resolvers/performance.resolver';
import { TopCampaignsResolver } from './resolvers/top-campaigns.resolver';
import { OfferReportsResolver } from './resolvers/offer-reports.resolver';
import { AffiliateReportsResolver } from './resolvers/affiliate-reports.resolver';
import { AdvertiserReportsResolver } from './resolvers/advertiser-reports.resolver';
import { ConversionReportsResolver } from './resolvers/conversion-reports.resolver';
import { ClickLogReportsResolver } from './resolvers/click-log-reports.resolver';
import { AffiliatePostbackLogsResolver } from './resolvers/affiliate-postback-logs.resolver';
import { AdvertiserPostbackLogsResolver } from './resolvers/advertiser-postback-logs.resolver';
import { FraudReportsResolver } from './resolvers/fraud-reports.resolver';

@Module({
  providers: [
    OverviewService,
    PerformanceService,
    TopCampaignsService,
    AdminReportsService,
    OverviewResolver,
    PerformanceResolver,
    TopCampaignsResolver,
    OfferReportsResolver,
    AffiliateReportsResolver,
    AdvertiserReportsResolver,
    ConversionReportsResolver,
    ClickLogReportsResolver,
    AffiliatePostbackLogsResolver,
    AdvertiserPostbackLogsResolver,
    FraudReportsResolver,
  ],
  exports: [
    OverviewService,
    PerformanceService,
    TopCampaignsService,
    AdminReportsService,
  ],
})
export class ReportsModule {}

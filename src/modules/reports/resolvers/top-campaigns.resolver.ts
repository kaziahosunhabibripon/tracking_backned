import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesExact } from '../../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { CampaignPerformance } from '../entities/campaign-performance.entity';
import { TopCampaignsService } from '../services/top-campaigns.service';
import { DateRangeInput } from '../dto/date-range.input';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => CampaignPerformance)
export class TopCampaignsResolver {
  constructor(private readonly topCampaignsService: TopCampaignsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.ADVERTISER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [CampaignPerformance], { name: 'topCampaigns' })
  async top(
    @CurrentUser() user: AuthenticatedUser,
    @Args('range', { type: () => DateRangeInput, nullable: true })
    range?: DateRangeInput,
    @Args('advertiserId', { type: () => String, nullable: true })
    advertiserId?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<CampaignPerformance[]> {
    if (user.role === UserRole.ADVERTISER) {
      advertiserId = undefined;
    }
    return this.topCampaignsService.top({
      advertiserId: advertiserId ?? undefined,
      preset: range?.preset,
      from: range?.from,
      to: range?.to,
      limit,
    });
  }
}

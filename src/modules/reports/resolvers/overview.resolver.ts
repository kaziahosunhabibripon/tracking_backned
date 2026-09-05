import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesExact } from '../../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { OverviewStats } from '../entities/overview-stats.entity';
import { OverviewService } from '../services/overview.service';
import { DateRangeInput } from '../dto/date-range.input';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Advertiser overview stats — 4 stat cards the advertiser dashboard
 * renders (Total Click, Conversion Rate, Pending Payout, Total Spent).
 *
 * Super-admin / staff can pass `advertiserId` to scope the view;
 * advertisers always see their own.
 */
@Resolver(() => OverviewStats)
export class OverviewResolver {
  constructor(private readonly overviewService: OverviewService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.ADVERTISER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => OverviewStats, { name: 'overviewStats' })
  async stats(
    @CurrentUser() user: AuthenticatedUser,
    @Args('range', { type: () => DateRangeInput, nullable: true })
    range?: DateRangeInput,
    @Args('advertiserId', { type: () => String, nullable: true })
    advertiserId?: string,
  ): Promise<OverviewStats> {
    // Advertisers can only see their own data.
    if (user.role === UserRole.ADVERTISER) {
      advertiserId = undefined; // scope enforced in service via caller's advertiser profile
    }
    return this.overviewService.stats({
      advertiserId: advertiserId ?? undefined,
      preset: range?.preset,
      from: range?.from,
      to: range?.to,
    });
  }
}

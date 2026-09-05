import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesExact } from '../../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { PerformancePoint } from '../entities/performance-point.entity';
import { PerformanceService } from '../services/performance.service';
import { DateRangeInput } from '../dto/date-range.input';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => PerformancePoint)
export class PerformanceResolver {
  constructor(private readonly performanceService: PerformanceService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.ADVERTISER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [PerformancePoint], { name: 'performanceSeries' })
  async series(
    @CurrentUser() user: AuthenticatedUser,
    @Args('range', { type: () => DateRangeInput, nullable: true })
    range?: DateRangeInput,
    @Args('advertiserId', { type: () => String, nullable: true })
    advertiserId?: string,
  ): Promise<PerformancePoint[]> {
    if (user.role === UserRole.ADVERTISER) {
      advertiserId = undefined;
    }
    return this.performanceService.series({
      advertiserId: advertiserId ?? undefined,
      preset: range?.preset,
      from: range?.from,
      to: range?.to,
    });
  }
}

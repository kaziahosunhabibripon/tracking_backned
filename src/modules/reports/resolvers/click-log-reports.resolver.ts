import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolesExact } from '../../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { AdminReportsService } from '../services/admin-reports.service';
import { ClickLogRecord } from '../entities/click-log-record.entity';
import { DateRangeInput } from '../dto/date-range.input';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => ClickLogRecord)
export class ClickLogReportsResolver {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [ClickLogRecord], { name: 'clickLogReports' })
  async list(
    @CurrentUser() _user: AuthenticatedUser,
    @Args('range', { type: () => DateRangeInput, nullable: true })
    range?: DateRangeInput,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ): Promise<ClickLogRecord[]> {
    const result = await this.adminReportsService.clickLogReports({
      preset: range?.preset,
      from: range?.from,
      to: range?.to,
      cursor,
      limit,
    });
    return result.data;
  }
}

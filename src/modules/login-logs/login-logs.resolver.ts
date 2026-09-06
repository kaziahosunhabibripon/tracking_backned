import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { LoginLogsService } from './login-logs.service';
import { LoginLog } from './entities/login-log.entity';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => LoginLog)
export class LoginLogsResolver {
  constructor(private readonly loginLogsService: LoginLogsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [LoginLog])
  async myLoginLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    return this.loginLogsService.findForUser(user.sub, limit);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [LoginLog])
  async loginLogs(
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    return this.loginLogsService.findAll(limit);
  }
}

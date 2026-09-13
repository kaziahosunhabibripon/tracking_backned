import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Roles, RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserFilterInput } from './dto/user-filter.input';
import { SetUserActiveInput } from './dto/set-user-active.input';
import { ChangeUserRoleInput } from './dto/change-user-role.input';

/**
 * Staff-only admin surface for the `User` table (list/search/deactivate/
 * change-role). Self-service profile reads/writes live in their own
 * domain-specific modules (affiliates, advertisers) — this is for staff
 * managing accounts, not a user managing their own.
 */
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Query(() => [User])
  async users(@Args('filter', { nullable: true }) filter?: UserFilterInput) {
    return this.usersService.findAll(filter ?? {});
  }

  @UseGuards(GqlJwtAuthGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Mutation(() => User, {
    description: 'Activate or deactivate a user account.',
  })
  async setUserActive(@Args('input') input: SetUserActiveInput) {
    return this.usersService.setActive(input.userId, input.isActive);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => User, {
    description:
      "Change a user's role. Restricted to SUPER_ADMIN — this can grant/revoke staff privileges, including SUPER_ADMIN itself.",
  })
  async changeUserRole(@Args('input') input: ChangeUserRoleInput) {
    return this.usersService.changeRole(input.userId, input.role);
  }
}

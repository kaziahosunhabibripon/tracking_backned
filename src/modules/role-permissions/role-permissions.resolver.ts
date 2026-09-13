import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermission } from './entities/role-permission.entity';
import { CreateRolePermissionInput } from './dto/role-permission.dto';

/**
 * CRUD for `RolePermission` rows only. `RolesGuard` does not read this table
 * — authorization is still decided entirely by `@Roles`/`@RolesExact` and the
 * static `ROLE_RANK` hierarchy. Granting or revoking a permission here has no
 * effect on what any user can actually do until it's wired into the guard
 * (see GAP-002 in GAP-ANALYSIS.md). The GraphQL descriptions below exist so
 * this doesn't get mistaken for a working fine-grained permission system.
 */
@Resolver(() => RolePermission)
export class RolePermissionsResolver {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [RolePermission], {
    description:
      'Not yet enforced anywhere — see RolePermission entity description.',
  })
  async rolePermissions() {
    return this.rolePermissionsService.findAll();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [RolePermission], {
    description:
      'Not yet enforced anywhere — see RolePermission entity description.',
  })
  async rolePermissionsByRole(@Args('role') role: string) {
    return this.rolePermissionsService.findByRole(role);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => RolePermission, {
    description:
      'Records a permission row only — RolesGuard does not read it yet, so this has no effect on authorization.',
  })
  async createRolePermission(@Args('input') input: CreateRolePermissionInput) {
    return this.rolePermissionsService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => Boolean, {
    description:
      'Deletes a permission row only — RolesGuard does not read it yet, so this has no effect on authorization.',
  })
  async deleteRolePermission(@Args('id') id: string) {
    await this.rolePermissionsService.remove(id);
    return true;
  }
}

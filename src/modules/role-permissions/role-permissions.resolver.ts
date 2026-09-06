import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermission } from './entities/role-permission.entity';
import { CreateRolePermissionInput } from './dto/role-permission.dto';

@Resolver(() => RolePermission)
export class RolePermissionsResolver {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [RolePermission])
  async rolePermissions() {
    return this.rolePermissionsService.findAll();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [RolePermission])
  async rolePermissionsByRole(@Args('role') role: string) {
    return this.rolePermissionsService.findByRole(role);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => RolePermission)
  async createRolePermission(@Args('input') input: CreateRolePermissionInput) {
    return this.rolePermissionsService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => Boolean)
  async deleteRolePermission(@Args('id') id: string) {
    await this.rolePermissionsService.remove(id);
    return true;
  }
}

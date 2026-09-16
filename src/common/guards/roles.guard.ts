import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_EXACT_KEY,
  ROLES_KEY,
} from '../constants/metadata.constants';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../errors/app.exception';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { RolePermissionsService } from '../../modules/role-permissions/role-permissions.service';

/**
 * Role rank for the hierarchical gate (`@Roles(...)`).
 * ADVERTISER is a peer to the staff track, not above it; advertiser-only
 * endpoints should use `@RolesExact(UserRole.ADVERTISER, ...)` so an
 * ADVERTISER cannot accidentally inherit staff/affiliate powers via rank.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.AFFILIATE]: 1,
  [UserRole.ADVERTISER]: 2,
  [UserRole.STAFF]: 3,
  [UserRole.MANAGER]: 4,
  [UserRole.ADMIN]: 5,
  [UserRole.SUPER_ADMIN]: 6,
};

/**
 * Authorization guard combining:
 * 1. Fixed role hierarchy (@Roles, @RolesExact)
 * 2. Dynamic permissions from RolePermission table (@Permissions)
 *
 * The permission check is ADDITIVE — if @Permissions is used, the user's role
 * must have at least one of the listed permissions in the RolePermission table.
 * This enables data-driven authorization managed via the role-permissions module
 * (Settings → Roles tab in the dashboard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const exactRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_EXACT_KEY,
      [context.getHandler(), context.getClass()],
    );
    const hierarchicalRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no role or permission requirements, allow access
    if (
      (!exactRoles || exactRoles.length === 0) &&
      (!hierarchicalRoles || hierarchicalRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Check fixed role hierarchy first (existing behavior)
    if (exactRoles && exactRoles.length > 0) {
      if (exactRoles.includes(user.role)) {
        return true;
      }
      // Hierarchical roles can further relax exact-match — e.g.
      // @RolesExact(AFFILIATE) + @Roles(SUPER_ADMIN) lets a super admin
      // poke the affiliate surface (admin tools, support).
      if (
        hierarchicalRoles &&
        hierarchicalRoles.length > 0 &&
        this.meetsRank(user.role, hierarchicalRoles)
      ) {
        return true;
      }
      throw new ForbiddenException();
    }

    if (hierarchicalRoles && hierarchicalRoles.length > 0) {
      if (this.meetsRank(user.role, hierarchicalRoles)) {
        return true;
      }
      throw new ForbiddenException();
    }

    // Check dynamic permissions from RolePermission table
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission =
        await this.rolePermissionsService.roleHasAnyPermission(
          user.role,
          requiredPermissions,
        );
      if (!hasPermission) {
        throw new ForbiddenException();
      }
      return true;
    }

    return true;
  }

  private meetsRank(role: UserRole, required: UserRole[]): boolean {
    const userRank = ROLE_RANK[role] ?? 0;
    const minRequiredRank = Math.min(
      ...required.map((r) => ROLE_RANK[r] ?? Infinity),
    );
    return userRank >= minRequiredRank;
  }

  private getUser(context: ExecutionContext): AuthenticatedUser | undefined {
    if (context.getType<GqlContextType>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext<{
        req?: { user?: AuthenticatedUser };
      }>();
      return ctx.req?.user;
    }
    return context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
      .user;
  }
}

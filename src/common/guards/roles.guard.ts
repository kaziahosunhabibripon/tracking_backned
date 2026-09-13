import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import {
  IS_PUBLIC_KEY,
  ROLES_EXACT_KEY,
  ROLES_KEY,
} from '../constants/metadata.constants';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../errors/app.exception';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

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
 * Note: this guard decides everything from `@Roles`/`@RolesExact` metadata
 * and `ROLE_RANK` below. It does not consult the `RolePermission` table —
 * that CRUD (see the role-permissions module) is not yet wired in here
 * (GAP-002 in GAP-ANALYSIS.md), so granting/revoking a row there has no
 * effect on what any user can do.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    if (
      (!exactRoles || exactRoles.length === 0) &&
      (!hierarchicalRoles || hierarchicalRoles.length === 0)
    ) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException();
    }

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

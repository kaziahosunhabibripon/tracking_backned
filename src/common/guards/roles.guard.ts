import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../constants/metadata.constants';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../errors/app.exception';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Role rank for hierarchy — a higher rank satisfies a lower-rank requirement.
 *
 * This is the fixed staff/affiliate hierarchy only. The dashboard's Settings →
 * Role tab (dynamic named roles + per-permission grants) is a SEPARATE,
 * data-driven system layered on top of this later — it does not replace it.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.AFFILIATE]: 1,
  [UserRole.STAFF]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 5,
};

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

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException();
    }

    const userRank = ROLE_RANK[user.role] ?? 0;
    const allowed = requiredRoles.some(
      (role) => userRank >= (ROLE_RANK[role] ?? Infinity),
    );
    if (!allowed) {
      throw new ForbiddenException();
    }
    return true;
  }

  private getUser(context: ExecutionContext): AuthenticatedUser | undefined {
    const ctx = GqlExecutionContext.create(context).getContext<{
      req?: { user?: AuthenticatedUser };
    }>();
    return ctx.req?.user;
  }
}

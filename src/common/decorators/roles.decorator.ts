import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_EXACT_KEY, ROLES_KEY } from '../constants/metadata.constants';

/**
 * Hierarchical role gate: STAFF satisfies MANAGER/ADMIN/SUPER_ADMIN too.
 * Use for staff-side endpoints (e.g. affiliate/manager/advertiser admin).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Exact role gate: the user must be one of the listed roles. ADVERTISER
 * and AFFILIATE are peers and should NEVER inherit each other via rank.
 */
export const RolesExact = (...roles: UserRole[]) =>
  SetMetadata(ROLES_EXACT_KEY, roles);

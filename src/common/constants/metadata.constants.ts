/** Reflector metadata keys shared by decorators + guards (single source, DRY). */
export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

/**
 * When set on a handler, the user must hold one of the listed roles EXACTLY
 * (no hierarchy). Use for peers like ADVERTISER vs AFFILIATE that should
 * never be allowed to see each other's data via rank.
 */
export const ROLES_EXACT_KEY = 'rolesExact';

import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/metadata.constants';

/**
 * Permission gate: the user's role must have at least one of the listed
 * permissions assigned via the RolePermission table. This enables dynamic,
 * data-driven authorization that can be managed at runtime via the
 * role-permissions module (Settings → Roles tab in the dashboard).
 *
 * Usage:
 *   @Permissions('campaigns:read', 'campaigns:write')
 *   @Resolver()
 *   export class CampaignsResolver { ... }
 *
 *   @Permissions('affiliates:manage')
 *   @Mutation(() => Affiliate)
 *   createAffiliate(...) { ... }
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

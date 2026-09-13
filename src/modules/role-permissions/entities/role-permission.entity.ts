import { Field, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

/**
 * Not enforced: `RolesGuard` never reads `RolePermission` rows. Authorization
 * is still decided entirely by `@Roles`/`@RolesExact` and `ROLE_RANK`
 * (see roles.guard.ts). This exists as CRUD-only until GAP-002 in
 * GAP-ANALYSIS.md is resolved with a real design for how a `permission`
 * string should affect access.
 */
@ObjectType({
  description:
    'Not yet enforced anywhere — RolesGuard does not read this table (see GAP-002 in GAP-ANALYSIS.md).',
})
export class RolePermission {
  @Field(() => String)
  id!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field()
  permission!: string;

  @Field(() => Date)
  createdAt!: Date;
}

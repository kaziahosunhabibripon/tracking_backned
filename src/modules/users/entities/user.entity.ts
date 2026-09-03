import { Field, ID, ObjectType } from '@nestjs/graphql';
import { UserRole } from '../enums/user-role.enum';

/**
 * The GraphQL-facing shape of a user. Deliberately hand-written (not a
 * `@prisma/client` re-export) so a new column on the `User` table is never
 * exposed to clients until someone explicitly adds a `@Field` for it —
 * `password` in particular must never gain one.
 */
@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field()
  isActive!: boolean;

  @Field(() => Date, { nullable: true })
  emailVerifiedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  lastLoginAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}

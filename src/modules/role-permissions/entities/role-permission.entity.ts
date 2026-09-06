import { Field, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

@ObjectType()
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

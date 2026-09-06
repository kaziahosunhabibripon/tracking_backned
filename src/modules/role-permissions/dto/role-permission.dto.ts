import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

@InputType()
export class CreateRolePermissionInput {
  @Field(() => UserRole)
  role!: UserRole;

  @Field()
  permission!: string;
}

import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateRolePermissionInput {
  @Field(() => UserRole)
  @IsEnum(UserRole)
  role!: UserRole;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  permission!: string;
}

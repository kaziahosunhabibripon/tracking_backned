import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class ChangeUserRoleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role!: UserRole;
}

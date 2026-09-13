import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class UserFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

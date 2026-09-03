import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize.util';

@InputType()
export class SignInInput {
  @Field()
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  // Login only checks presence — length rules belong to registration
  // (existing accounts may predate the current password policy).
  @Field()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

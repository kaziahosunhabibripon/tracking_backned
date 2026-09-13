import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateReferralInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  referrerId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  referredId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;
}

@InputType()
export class ReferralCodeInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;
}

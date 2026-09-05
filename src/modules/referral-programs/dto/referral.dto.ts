import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateReferralInput {
  @Field()
  referrerId!: string;

  @Field()
  referredId!: string;

  @Field()
  code!: string;
}

@InputType()
export class ReferralCodeInput {
  @Field()
  code!: string;
}

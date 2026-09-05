import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Referral {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  referrerId!: string;

  @Field(() => String)
  referredId!: string;

  @Field()
  code!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class ReferralStats {
  @Field(() => String)
  affiliateId!: string;

  @Field(() => String)
  referralCode!: string;

  @Field(() => Int)
  referredCount!: number;
}

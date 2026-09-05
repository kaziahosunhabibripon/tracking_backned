import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AffiliateReportRecord {
  @Field(() => String)
  affiliateId!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  initials!: string;

  @Field(() => Int)
  avatarSlot!: number;

  @Field()
  countryCode!: string;

  @Field()
  countryName!: string;

  @Field(() => Int)
  clicks!: number;

  @Field(() => Int)
  conversions!: number;

  @Field(() => Float)
  revenue!: number;

  @Field()
  status!: string;
}

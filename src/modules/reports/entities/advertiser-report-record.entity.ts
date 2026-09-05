import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdvertiserReportRecord {
  @Field(() => String)
  advertiserId!: string;

  @Field()
  name!: string;

  @Field()
  company!: string;

  @Field()
  initials!: string;

  @Field(() => Int)
  avatarSlot!: number;

  @Field(() => Int)
  offersCount!: number;

  @Field(() => Int)
  clicks!: number;

  @Field(() => Int)
  conversions!: number;

  @Field(() => Float)
  revenue!: number;

  @Field(() => Float)
  payoutRate!: number;

  @Field()
  status!: string;
}

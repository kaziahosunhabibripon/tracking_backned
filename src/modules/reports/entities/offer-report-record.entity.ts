import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OfferReportRecord {
  @Field(() => String)
  offerId!: string;

  @Field()
  offerName!: string;

  @Field()
  company!: string;

  @Field()
  type!: string;

  @Field(() => Int)
  clicks!: number;

  @Field(() => Int)
  conversions!: number;

  @Field(() => Float)
  revenue!: number;

  @Field(() => Float)
  payout!: number;

  @Field()
  status!: string;
}

@ObjectType()
export class OfferReportsMeta {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

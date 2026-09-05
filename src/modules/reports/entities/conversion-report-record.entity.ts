import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversionReportRecord {
  @Field(() => String)
  transactionId!: string;

  @Field()
  transactionDate!: string;

  @Field()
  transactionTime!: string;

  @Field()
  offerName!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field()
  countryCode!: string;

  @Field()
  countryName!: string;

  @Field(() => Float)
  payout!: number;

  @Field()
  status!: string;
}

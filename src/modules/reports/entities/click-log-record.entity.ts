import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ClickLogRecord {
  @Field(() => String)
  clickId!: string;

  @Field()
  clickDate!: string;

  @Field()
  clickTime!: string;

  @Field()
  offerName!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field()
  ip!: string;

  @Field()
  countryCode!: string;

  @Field()
  countryName!: string;

  @Field()
  device!: string;

  @Field()
  browser!: string;

  @Field()
  converted!: boolean;
}

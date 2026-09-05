import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CampaignPerformance {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  status!: string;

  @Field()
  clicks!: number;

  @Field()
  conversions!: number;

  @Field()
  cr!: string;

  @Field()
  epc!: string;

  @Field()
  revenue!: string;

  @Field()
  payout!: string;
}

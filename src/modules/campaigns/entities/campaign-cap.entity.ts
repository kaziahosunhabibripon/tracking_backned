import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CapType } from '../enums/campaign.enums';

@ObjectType()
export class CampaignCap {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  campaignId!: string;

  @Field(() => CapType)
  capType!: CapType;

  @Field(() => Int)
  capLimit!: number;

  @Field(() => Int)
  currentCount!: number;

  @Field(() => Date, { nullable: true })
  resetAt!: Date | null;
}

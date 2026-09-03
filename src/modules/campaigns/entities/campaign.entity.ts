import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CampaignPayout } from './campaign-payout.entity';
import { CampaignCap } from './campaign-cap.entity';
import { CampaignRemark } from './campaign-remark.entity';
import { CampaignStatus, CostModel, Currency } from '../enums/campaign.enums';

@ObjectType()
export class Campaign {
  @Field(() => ID)
  id!: string;

  @Field()
  slug!: string;

  @Field(() => ID)
  advertiserId!: string;

  @Field()
  name!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  kpi!: string | null;

  @Field()
  category!: string;

  @Field()
  previewLink!: string;

  @Field()
  trackingLink!: string;

  @Field(() => String, { nullable: true })
  partner!: string | null;

  @Field(() => CostModel)
  costModel!: CostModel;

  /** Decimal(12,4) — surfaced as string for precision. */
  @Field()
  defaultCost!: string;

  @Field(() => Currency)
  currency!: Currency;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => CampaignStatus)
  status!: CampaignStatus;

  @Field(() => String, { nullable: true })
  icon!: string | null;

  @Field(() => [String])
  geo!: string[];

  @Field(() => [String])
  trafficAllowed!: string[];

  @Field(() => [CampaignPayout])
  payouts!: CampaignPayout[];

  @Field(() => [CampaignCap])
  caps!: CampaignCap[];

  @Field(() => [CampaignRemark])
  remarks!: CampaignRemark[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

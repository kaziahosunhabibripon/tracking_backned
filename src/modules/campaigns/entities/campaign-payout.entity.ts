import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Currency, PayoutType } from '../enums/campaign.enums';

@ObjectType()
export class CampaignPayout {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  campaignId!: string;

  @Field(() => String, { nullable: true })
  country!: string | null;

  @Field(() => String, { nullable: true })
  device!: string | null;

  @Field(() => String, { nullable: true })
  platform!: string | null;

  @Field(() => PayoutType)
  payoutType!: PayoutType;

  /** Decimal(12,4) — surfaced as string for precision. */
  @Field()
  payoutValue!: string;

  @Field(() => Currency)
  currency!: Currency;
}

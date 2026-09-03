import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  AffiliateStatus,
  BusinessType,
  ContactMethod,
  CurrentPlatform,
  ReferralSource,
} from '../enums/affiliate.enums';

@ObjectType()
export class Affiliate {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => BusinessType)
  businessType!: BusinessType;

  @Field()
  phone!: string;

  @Field()
  country!: string;

  @Field(() => ContactMethod, { nullable: true })
  contactMethod!: ContactMethod | null;

  @Field(() => CurrentPlatform)
  currentPlatform!: CurrentPlatform;

  @Field(() => ReferralSource, { nullable: true })
  referralSource!: ReferralSource | null;

  @Field(() => AffiliateStatus)
  status!: AffiliateStatus;

  @Field(() => Date)
  createdAt!: Date;
}

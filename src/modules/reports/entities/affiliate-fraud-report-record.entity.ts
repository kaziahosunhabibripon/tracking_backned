import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AffiliateFraudReportRecord {
  @Field(() => String)
  caseId!: string;

  @Field()
  caseDate!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field()
  affiliateName!: string;

  @Field()
  affiliateEmail!: string;

  @Field()
  affiliateInitials!: string;

  @Field(() => Int)
  affiliateAvatarSlot!: number;

  @Field()
  offerName!: string;

  @Field()
  reason!: string;

  @Field(() => Int)
  flaggedClicks!: number;

  @Field(() => Int)
  fraudPercent!: number;

  @Field()
  risk!: string;

  @Field()
  status!: string;
}

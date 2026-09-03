import { Field, ID, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

@ObjectType()
export class CampaignRemark {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  campaignId!: string;

  @Field(() => UserRole)
  forRole!: UserRole;

  @Field()
  text!: string;

  @Field(() => Date)
  createdAt!: Date;
}

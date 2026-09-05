import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateAffiliateGroupInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class UpdateAffiliateGroupInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class AddGroupMemberInput {
  @Field()
  groupId!: string;

  @Field()
  affiliateId!: string;

  @Field({ defaultValue: 'MEMBER' })
  role?: string;
}

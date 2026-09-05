import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AffiliateGroup {
  @Field(() => String)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => [String])
  tags!: string[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class AffiliateGroupMember {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  groupId!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field()
  role!: string;

  @Field(() => Date)
  joinedAt!: Date;
}

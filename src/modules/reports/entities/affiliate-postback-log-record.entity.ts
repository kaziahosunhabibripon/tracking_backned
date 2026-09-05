import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AffiliatePostbackLogRecord {
  @Field(() => String)
  postbackId!: string;

  @Field()
  postbackDate!: string;

  @Field()
  postbackTime!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field(() => String)
  transactionId!: string;

  @Field()
  endpointUrl!: string;

  @Field(() => Int)
  httpStatus!: number;

  @Field(() => Int)
  attempts!: number;

  @Field()
  successful!: boolean;
}

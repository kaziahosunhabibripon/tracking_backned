import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdvertiserPostbackLogRecord {
  @Field(() => String)
  postbackId!: string;

  @Field()
  postbackDate!: string;

  @Field()
  postbackTime!: string;

  @Field(() => String)
  advertiserId!: string;

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

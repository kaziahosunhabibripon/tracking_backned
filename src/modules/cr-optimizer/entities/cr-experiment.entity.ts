import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class CrExperiment {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  offerId!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  status!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

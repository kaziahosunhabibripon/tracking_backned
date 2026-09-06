import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Setting {
  @Field(() => String)
  id!: string;

  @Field()
  key!: string;

  @Field(() => GraphQLJSON)
  value!: unknown;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

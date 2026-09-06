import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class SignupQuestion {
  @Field(() => String)
  id!: string;

  @Field()
  label!: string;

  @Field()
  type!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  options?: unknown;

  @Field()
  required!: boolean;

  @Field(() => Number)
  sortOrder!: number;

  @Field()
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

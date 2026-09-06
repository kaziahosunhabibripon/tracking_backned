import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpsertSettingInput {
  @Field()
  key!: string;

  @Field(() => GraphQLJSON)
  value!: Prisma.InputJsonValue;
}

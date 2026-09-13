import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpsertSettingInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key!: string;

  /**
   * Free-form JSON blob — its shape varies per key, so there is no single
   * class-validator check that would fit. Left unvalidated intentionally.
   */
  @Field(() => GraphQLJSON)
  value!: Prisma.InputJsonValue;
}

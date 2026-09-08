import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateCrExperimentInput {
  @Field()
  offerId!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ defaultValue: 'ACTIVE' })
  status?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Prisma.InputJsonValue;
}

@InputType()
export class UpdateCrExperimentInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Prisma.InputJsonValue;
}

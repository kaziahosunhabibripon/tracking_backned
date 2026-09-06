import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateSignupQuestionInput {
  @Field()
  label!: string;

  @Field({ defaultValue: 'text' })
  type?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  options?: Prisma.InputJsonValue;

  @Field({ defaultValue: false })
  required?: boolean;

  @Field(() => Number, { defaultValue: 0 })
  sortOrder?: number;

  @Field({ defaultValue: true })
  isActive?: boolean;
}

@InputType()
export class UpdateSignupQuestionInput {
  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  options?: Prisma.InputJsonValue;

  @Field({ nullable: true })
  required?: boolean;

  @Field(() => Number, { nullable: true })
  sortOrder?: number;

  @Field({ nullable: true })
  isActive?: boolean;
}

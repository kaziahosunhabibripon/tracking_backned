import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateCrExperimentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  offerId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field({ defaultValue: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  // JSON blob of experiment metadata — shape varies per experiment, no
  // useful class-validator check beyond what the global ValidationPipe
  // already does.
  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Prisma.InputJsonValue;
}

@InputType()
export class UpdateCrExperimentInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  // JSON blob of experiment metadata — see CreateCrExperimentInput.metadata.
  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Prisma.InputJsonValue;
}

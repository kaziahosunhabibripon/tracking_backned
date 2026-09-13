import { Field, InputType } from '@nestjs/graphql';
import { Prisma, PlanInterval } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreatePlanInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Decimal string (e.g. "9.99"). Converted to Decimal by Prisma. */
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  price!: string;

  @Field(() => String, { defaultValue: 'MONTH' })
  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceId?: string;

  // JSON blob of plan features/limits — shape varies per plan, no useful
  // class-validator check beyond what the global ValidationPipe already does.
  @Field(() => GraphQLJSON)
  features!: Prisma.InputJsonValue;
}

@InputType()
export class UpdatePlanInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  price?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceId?: string;

  // JSON blob of plan features/limits — see CreatePlanInput.features.
  @Field(() => GraphQLJSON, { nullable: true })
  features?: Prisma.InputJsonValue;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateSignupQuestionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  label!: string;

  @Field({ defaultValue: 'text' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  /**
   * Free-form JSON (e.g. select/checkbox options) — shape varies per
   * question type, so there is no single class-validator check that fits.
   */
  @Field(() => GraphQLJSON, { nullable: true })
  options?: Prisma.InputJsonValue;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @Field(() => Number, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateSignupQuestionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  label?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  /** Free-form JSON — see CreateSignupQuestionInput.options. */
  @Field(() => GraphQLJSON, { nullable: true })
  options?: Prisma.InputJsonValue;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

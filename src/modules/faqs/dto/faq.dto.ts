import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateFaqInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  answer!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @Field(() => Number, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

@InputType()
export class UpdateFaqInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answer?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

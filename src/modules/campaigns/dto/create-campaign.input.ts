import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CampaignStatus,
  CapType,
  CostModel,
  Currency,
  PayoutType,
} from '../enums/campaign.enums';
import { UserRole } from '@prisma/client';

@InputType()
export class CreateCampaignPayoutInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  device?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @Field(() => PayoutType)
  @IsEnum(PayoutType)
  payoutType!: PayoutType;

  /** Decimal string (e.g. "2.5000"). Converted to Decimal in service. */
  @Field()
  @IsString()
  payoutValue!: string;

  @Field(() => Currency, { nullable: true })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

@InputType()
export class CreateCampaignCapInput {
  @Field(() => CapType)
  @IsEnum(CapType)
  capType!: CapType;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  capLimit!: number;
}

@InputType()
export class CreateCampaignRemarkInput {
  @Field(() => UserRole)
  @IsEnum(UserRole)
  forRole!: UserRole;

  @Field()
  @IsString()
  @MaxLength(2000)
  text!: string;
}

/**
 * One-shot create matching the Create Campaign form's 5 steps. Nested
 * payouts/caps/remarks are written in a transaction so a half-created
 * campaign is never possible.
 */
@InputType()
export class CreateCampaignInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  kpi?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  category!: string;

  @Field()
  @IsUrl({ require_tld: false })
  previewLink!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  trackingLink!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  partner?: string;

  @Field(() => CostModel, { nullable: true })
  @IsOptional()
  @IsEnum(CostModel)
  costModel?: CostModel;

  @Field()
  @IsString()
  defaultCost!: string;

  @Field(() => Currency, { nullable: true })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @Field()
  @IsDateString()
  startDate!: string;

  @Field()
  @IsDateString()
  endDate!: string;

  @Field(() => CampaignStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  geo?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  trafficAllowed?: string[];

  @Field(() => [CreateCampaignPayoutInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignPayoutInput)
  @ArrayMaxSize(50)
  payouts?: CreateCampaignPayoutInput[];

  @Field(() => [CreateCampaignCapInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignCapInput)
  @ArrayMaxSize(10)
  caps?: CreateCampaignCapInput[];

  @Field(() => [CreateCampaignRemarkInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignRemarkInput)
  @ArrayMaxSize(20)
  remarks?: CreateCampaignRemarkInput[];
}

import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

export type DateRangePreset =
  'today' | 'yesterday' | '7d' | 'month' | 'last-month' | 'custom';

export enum DateRangePresetEnum {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  SEVEN_DAYS = '7d',
  MONTH = 'month',
  LAST_MONTH = 'last-month',
  CUSTOM = 'custom',
}

@InputType()
export class DateRangeInput {
  @Field(() => DateRangePresetEnum, { nullable: true })
  @IsOptional()
  @IsEnum(DateRangePresetEnum)
  preset?: DateRangePresetEnum;

  /** ISO date string — only used when `preset = CUSTOM`. */
  @Field({ nullable: true })
  @IsOptional()
  from?: string;

  /** ISO date string — only used when `preset = CUSTOM`. */
  @Field({ nullable: true })
  @IsOptional()
  to?: string;
}

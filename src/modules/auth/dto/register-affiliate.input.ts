import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import {
  BusinessType,
  ContactMethod,
  CurrentPlatform,
  ReferralSource,
} from '../../affiliates/enums/affiliate.enums';
import {
  normalizeEmail,
  trimString,
} from '../../../common/utils/normalize.util';

/** Mirrors the `/sign-up` form in tracking-super-admin-dashboard. */
@InputType()
export class RegisterAffiliateInput {
  @Field()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @Field()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @Field()
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  // Blocks a whitespace-only password ("        " passes MinLength(8) on its
  // own) — deliberately NOT trimming the password itself, since silently
  // altering what the user typed would make their password different from
  // what they think they set.
  @Matches(/\S/, { message: 'password must not be blank' })
  password!: string;

  @Field(() => BusinessType)
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  // E.164-formatted (the frontend's phone field enforces this) — validated as
  // a plain string here rather than a phone-format decorator, to avoid a hard
  // dependency on a phone-parsing library on the backend for a value the
  // client already normalizes.
  @Field()
  @IsString()
  @Length(6, 20)
  phone!: string;

  /** ISO 3166-1 alpha-2 country code. */
  @Field()
  @IsString()
  @Length(2, 2)
  country!: string;

  @Field(() => ContactMethod, { nullable: true })
  @IsOptional()
  @IsEnum(ContactMethod)
  contactMethod?: ContactMethod;

  @Field(() => CurrentPlatform, { nullable: true })
  @IsOptional()
  @IsEnum(CurrentPlatform)
  currentPlatform?: CurrentPlatform;

  @Field(() => ReferralSource, { nullable: true })
  @IsOptional()
  @IsEnum(ReferralSource)
  referralSource?: ReferralSource;
}

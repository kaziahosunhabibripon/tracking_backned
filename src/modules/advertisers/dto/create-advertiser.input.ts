import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AdvertiserStatus, ContactMethod } from '../enums/advertiser.enums';

/**
 * Admin-side "Add Advertiser" payload. Matches the Add Advertiser form
 * in tracking-super-admin-dashboard (Identity & Management → Login
 * Credentials → Contact Channel → Advanced), in a single DTO so the
 * super-admin flow is a one-shot create.
 */
@InputType()
export class CreateAdvertiserInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @Field()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  country!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  managerId?: string;

  @Field(() => ContactMethod, { nullable: true })
  @IsOptional()
  @IsEnum(ContactMethod)
  contactMethod?: ContactMethod;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  commissionRate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payoutMethod?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referralCode?: string;

  @Field(() => AdvertiserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdvertiserStatus)
  status?: AdvertiserStatus;
}

import { Field, InputType } from '@nestjs/graphql';
import { PaymentStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreatePaymentTermInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  affiliateId!: string;

  /** Decimal string (e.g. "50.00"). Converted to Decimal by Prisma. */
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  minPayout!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  paymentMethod!: string;

  @Field({ defaultValue: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

@InputType()
export class UpdatePaymentTermInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  minPayout?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  paymentMethod?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

@InputType()
export class CreateAffiliatePaymentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  affiliateId!: string;

  /** Decimal string (e.g. "125.50"). Converted to Decimal by Prisma. */
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @Field({ defaultValue: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  paymentMethod!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;
}

@InputType()
export class UpdatePaymentStatusInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @Field(() => PaymentStatus)
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;
}

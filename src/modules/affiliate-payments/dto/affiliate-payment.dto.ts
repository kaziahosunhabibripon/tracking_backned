import { Field, InputType } from '@nestjs/graphql';
import { PaymentStatus } from '@prisma/client';

@InputType()
export class CreatePaymentTermInput {
  @Field()
  affiliateId!: string;

  @Field(() => String)
  minPayout!: string;

  @Field()
  paymentMethod!: string;

  @Field({ defaultValue: 'USD' })
  currency?: string;
}

@InputType()
export class UpdatePaymentTermInput {
  @Field(() => String, { nullable: true })
  minPayout?: string;

  @Field({ nullable: true })
  paymentMethod?: string;

  @Field({ nullable: true })
  currency?: string;
}

@InputType()
export class CreateAffiliatePaymentInput {
  @Field()
  affiliateId!: string;

  @Field(() => String)
  amount!: string;

  @Field({ defaultValue: 'USD' })
  currency?: string;

  @Field()
  paymentMethod!: string;

  @Field({ nullable: true })
  transactionId?: string;
}

@InputType()
export class UpdatePaymentStatusInput {
  @Field()
  paymentId!: string;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field({ nullable: true })
  transactionId?: string;
}

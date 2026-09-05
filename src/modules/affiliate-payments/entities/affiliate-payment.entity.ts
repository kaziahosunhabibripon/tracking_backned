import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentTerm {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field(() => String)
  minPayout!: string;

  @Field()
  paymentMethod!: string;

  @Field()
  currency!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class AffiliatePayment {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  affiliateId!: string;

  @Field(() => String)
  amount!: string;

  @Field()
  currency!: string;

  @Field(() => String)
  status!: string;

  @Field()
  paymentMethod!: string;

  @Field(() => String, { nullable: true })
  transactionId?: string;

  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @Field(() => Date)
  createdAt!: Date;
}

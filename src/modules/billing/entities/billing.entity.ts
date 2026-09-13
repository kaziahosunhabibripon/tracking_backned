import { Field, ObjectType } from '@nestjs/graphql';
import { PlanInterval, SubscriptionStatus } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

/** A URL to redirect the browser to — a Stripe Checkout or Billing Portal session. */
@ObjectType()
export class StripeRedirect {
  @Field(() => String)
  url!: string;
}

@ObjectType()
export class Plan {
  @Field(() => String)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String)
  price!: string;

  @Field(() => PlanInterval)
  interval!: PlanInterval;

  @Field(() => String, { nullable: true })
  stripePriceId?: string;

  @Field(() => GraphQLJSON)
  features!: unknown;

  @Field()
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class Subscription {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  planId!: string;

  @Field(() => Plan)
  plan!: Plan;

  @Field(() => SubscriptionStatus)
  status!: SubscriptionStatus;

  @Field(() => String, { nullable: true })
  stripeSubscriptionId?: string;

  @Field(() => String, { nullable: true })
  stripeCustomerId?: string;

  @Field(() => Date)
  currentPeriodStart!: Date;

  @Field(() => Date)
  currentPeriodEnd!: Date;

  @Field()
  cancelAtPeriodEnd!: boolean;

  @Field(() => Date, { nullable: true })
  canceledAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class PaymentMethod {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  stripePaymentMethodId!: string;

  @Field()
  isDefault!: boolean;

  @Field(() => String, { nullable: true })
  last4?: string;

  @Field(() => String, { nullable: true })
  brand?: string;

  @Field(() => Date, { nullable: true })
  expiryMonth?: Date;

  @Field(() => Date, { nullable: true })
  expiryYear?: Date;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class Invoice {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String, { nullable: true })
  subscriptionId?: string;

  @Field(() => String, { nullable: true })
  stripeInvoiceId?: string;

  @Field(() => String, { nullable: true })
  number?: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  amountDue!: string;

  @Field(() => String)
  amountPaid!: string;

  @Field()
  currency!: string;

  @Field(() => String, { nullable: true })
  invoicePdf?: string;

  @Field(() => String, { nullable: true })
  hostedInvoiceUrl?: string;

  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @Field(() => Date)
  createdAt!: Date;
}

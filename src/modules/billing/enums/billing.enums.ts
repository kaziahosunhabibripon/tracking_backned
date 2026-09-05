import { registerEnumType } from '@nestjs/graphql';
import {
  PlanInterval,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethodType,
} from '@prisma/client';

export { PlanInterval, SubscriptionStatus, InvoiceStatus, PaymentMethodType };

registerEnumType(PlanInterval, {
  name: 'PlanInterval',
  description: 'Billing interval for a plan.',
});

registerEnumType(SubscriptionStatus, {
  name: 'SubscriptionStatus',
  description: 'Current status of a subscription.',
});

registerEnumType(InvoiceStatus, {
  name: 'InvoiceStatus',
  description: 'Invoice payment status.',
});

registerEnumType(PaymentMethodType, {
  name: 'PaymentMethodType',
  description: 'Type of payment method.',
});

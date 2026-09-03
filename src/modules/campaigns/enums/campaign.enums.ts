import { registerEnumType } from '@nestjs/graphql';
import {
  CampaignStatus,
  CapType,
  CostModel,
  Currency,
  PayoutType,
} from '@prisma/client';

export { CampaignStatus, CapType, CostModel, Currency, PayoutType };

registerEnumType(CampaignStatus, {
  name: 'CampaignStatus',
  description:
    'DRAFT = being authored; PENDING_APPROVAL = waiting on admin/manager review; ACTIVE = live and tracking; PAUSED = temporarily off; EXPIRED = endDate passed; REJECTED = admin denied.',
});

registerEnumType(CapType, {
  name: 'CapType',
  description:
    'Cadence the cap resets on. TOTAL never resets until manually changed.',
});

registerEnumType(CostModel, {
  name: 'CostModel',
  description: 'How the advertiser is charged for conversions.',
});

registerEnumType(Currency, {
  name: 'Currency',
  description: 'ISO-4217 currency code used for payouts and totals.',
});

registerEnumType(PayoutType, {
  name: 'PayoutType',
  description: 'How a payout is computed for a single conversion.',
});

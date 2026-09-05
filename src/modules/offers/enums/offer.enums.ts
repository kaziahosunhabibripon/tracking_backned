import { registerEnumType } from '@nestjs/graphql';
import { OfferType, OfferStatus, OfferAccess } from '@prisma/client';

export { OfferType, OfferStatus, OfferAccess };

registerEnumType(OfferType, {
  name: 'OfferType',
  description: 'Type of offer (CPA, CPL, CPS, CPI).',
});

registerEnumType(OfferStatus, {
  name: 'OfferStatus',
  description: 'Offer lifecycle status.',
});

registerEnumType(OfferAccess, {
  name: 'OfferAccess',
  description: 'Whether an offer is public or private.',
});

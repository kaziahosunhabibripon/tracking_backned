import { registerEnumType } from '@nestjs/graphql';
import {
  AffiliateStatus,
  BusinessType,
  ContactMethod,
  CurrentPlatform,
  ReferralSource,
} from '@prisma/client';

export {
  AffiliateStatus,
  BusinessType,
  ContactMethod,
  CurrentPlatform,
  ReferralSource,
};

registerEnumType(BusinessType, {
  name: 'BusinessType',
  description: 'What kind of business the applicant runs.',
});

registerEnumType(ContactMethod, {
  name: 'ContactMethod',
  description: "The applicant's preferred contact channel.",
});

registerEnumType(CurrentPlatform, {
  name: 'CurrentPlatform',
  description: 'The affiliate platform the applicant currently uses, if any.',
});

registerEnumType(ReferralSource, {
  name: 'ReferralSource',
  description: 'How the applicant heard about the network.',
});

registerEnumType(AffiliateStatus, {
  name: 'AffiliateStatus',
  description: 'Application/account status shown on the affiliates table.',
});

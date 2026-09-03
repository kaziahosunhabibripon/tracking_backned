import { registerEnumType } from '@nestjs/graphql';
import { AdvertiserStatus, ContactMethod } from '@prisma/client';

export { AdvertiserStatus, ContactMethod };

registerEnumType(AdvertiserStatus, {
  name: 'AdvertiserStatus',
  description:
    'Application/account status shown on the advertisers table. PENDING = awaiting admin review, ACTIVE = approved and can run campaigns, INACTIVE = disabled by admin or self, SUSPENDED = temporarily blocked.',
});

registerEnumType(ContactMethod, {
  name: 'AdvertiserContactMethod',
  description: "The advertiser's preferred contact channel.",
});

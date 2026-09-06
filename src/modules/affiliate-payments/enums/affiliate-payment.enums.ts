import { registerEnumType } from '@nestjs/graphql';
import { PaymentStatus } from '@prisma/client';

export { PaymentStatus };

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Payment status for affiliate payments.',
});

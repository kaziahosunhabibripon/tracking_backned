import { registerEnumType } from '@nestjs/graphql';
import { TicketPriority, TicketStatus } from '@prisma/client';

export { TicketPriority, TicketStatus };

registerEnumType(TicketPriority, {
  name: 'TicketPriority',
  description: 'Priority level for support tickets.',
});

registerEnumType(TicketStatus, {
  name: 'TicketStatus',
  description: 'Current status of a support ticket.',
});

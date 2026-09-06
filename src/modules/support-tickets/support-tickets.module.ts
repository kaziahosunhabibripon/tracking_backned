import { Module } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsResolver } from './support-tickets.resolver';

@Module({
  providers: [SupportTicketsService, SupportTicketsResolver],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}

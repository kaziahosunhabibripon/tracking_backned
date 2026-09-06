import { Module } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { FaqsResolver } from './faqs.resolver';

@Module({
  providers: [FaqsService, FaqsResolver],
  exports: [FaqsService],
})
export class FaqsModule {}

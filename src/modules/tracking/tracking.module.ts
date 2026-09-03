import { Module } from '@nestjs/common';
import { ClickService } from './click.service';
import { PostbackService } from './postback.service';
import { PostbackController } from './postback.controller';
import { TrackingController } from './tracking.controller';

@Module({
  providers: [ClickService, PostbackService],
  controllers: [TrackingController, PostbackController],
  exports: [ClickService, PostbackService],
})
export class TrackingModule {}

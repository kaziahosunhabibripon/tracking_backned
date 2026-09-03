import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdvertisersResolver } from './advertisers.resolver';
import { AdvertisersService } from './advertisers.service';

@Module({
  imports: [UsersModule],
  providers: [AdvertisersService, AdvertisersResolver],
  exports: [AdvertisersService],
})
export class AdvertisersModule {}

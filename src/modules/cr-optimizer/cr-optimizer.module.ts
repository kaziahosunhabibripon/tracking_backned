import { Module } from '@nestjs/common';
import { CrOptimizerService } from './cr-optimizer.service';
import { CrOptimizerResolver } from './cr-optimizer.resolver';

@Module({
  providers: [CrOptimizerService, CrOptimizerResolver],
  exports: [CrOptimizerService],
})
export class CrOptimizerModule {}

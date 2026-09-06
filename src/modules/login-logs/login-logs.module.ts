import { Module } from '@nestjs/common';
import { LoginLogsService } from './login-logs.service';
import { LoginLogsResolver } from './login-logs.resolver';

@Module({
  providers: [LoginLogsService, LoginLogsResolver],
  exports: [LoginLogsService],
})
export class LoginLogsModule {}

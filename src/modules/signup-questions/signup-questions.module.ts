import { Module } from '@nestjs/common';
import { SignupQuestionsService } from './signup-questions.service';
import { SignupQuestionsResolver } from './signup-questions.resolver';

@Module({
  providers: [SignupQuestionsService, SignupQuestionsResolver],
  exports: [SignupQuestionsService],
})
export class SignupQuestionsModule {}

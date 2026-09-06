import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { SignupQuestionsService } from './signup-questions.service';
import { SignupQuestion } from './entities/signup-question.entity';
import {
  CreateSignupQuestionInput,
  UpdateSignupQuestionInput,
} from './dto/signup-question.dto';

@Resolver(() => SignupQuestion)
export class SignupQuestionsResolver {
  constructor(
    private readonly signupQuestionsService: SignupQuestionsService,
  ) {}

  /** Feeds the public signup form — must be reachable without a JWT. */
  @Public()
  @Query(() => [SignupQuestion])
  async signupQuestions() {
    return this.signupQuestionsService.findAll();
  }

  @Public()
  @Query(() => SignupQuestion, { nullable: true })
  async signupQuestion(@Args('id') id: string) {
    return this.signupQuestionsService.findOne(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => SignupQuestion)
  async createSignupQuestion(@Args('input') input: CreateSignupQuestionInput) {
    return this.signupQuestionsService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => SignupQuestion)
  async updateSignupQuestion(
    @Args('id') id: string,
    @Args('input') input: UpdateSignupQuestionInput,
  ) {
    return this.signupQuestionsService.update(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => Boolean)
  async deleteSignupQuestion(@Args('id') id: string) {
    await this.signupQuestionsService.remove(id);
    return true;
  }
}

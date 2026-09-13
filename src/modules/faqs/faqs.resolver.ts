import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { NotFoundException } from '../../common/errors/app.exception';
import { FaqsService } from './faqs.service';
import { Faq } from './entities/faq.entity';
import { CreateFaqInput, UpdateFaqInput } from './dto/faq.dto';

@Resolver(() => Faq)
export class FaqsResolver {
  constructor(private readonly faqsService: FaqsService) {}

  /** Feeds the public signup form — must be reachable without a JWT. */
  @Public()
  @Query(() => [Faq])
  async faqs(
    @Args('publishedOnly', { type: () => Boolean, nullable: true })
    publishedOnly?: boolean,
  ) {
    return this.faqsService.findAll(publishedOnly);
  }

  @Public()
  @Query(() => Faq)
  async faq(@Args('id') id: string) {
    const faq = await this.faqsService.findOne(id);
    if (!faq) throw new NotFoundException('FAQ not found.');
    return faq;
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Faq)
  async createFaq(@Args('input') input: CreateFaqInput) {
    return this.faqsService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Faq)
  async updateFaq(
    @Args('id') id: string,
    @Args('input') input: UpdateFaqInput,
  ) {
    return this.faqsService.update(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => Boolean)
  async deleteFaq(@Args('id') id: string) {
    await this.faqsService.remove(id);
    return true;
  }
}

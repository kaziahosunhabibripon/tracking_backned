import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { ReferralProgramsService } from './referral-programs.service';
import { Referral, ReferralStats } from './entities/referral.entity';
import { CreateReferralInput, ReferralCodeInput } from './dto/referral.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => Referral)
export class ReferralProgramsResolver {
  constructor(
    private readonly referralProgramsService: ReferralProgramsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Referral, { nullable: true })
  async referralByCode(@Args('input') input: ReferralCodeInput) {
    return this.referralProgramsService.findByCode(input.code);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Referral])
  async myReferrals(@CurrentUser() user: AuthenticatedUser) {
    return this.referralProgramsService.findByReferrer(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => ReferralStats)
  async myReferralStats(@CurrentUser() user: AuthenticatedUser) {
    return this.referralProgramsService.stats(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Referral)
  async createReferral(@Args('input') input: CreateReferralInput) {
    return this.referralProgramsService.create(input);
  }
}

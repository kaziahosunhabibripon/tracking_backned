import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { AffiliatesService } from '../affiliates/affiliates.service';
import { ReferralProgramsService } from './referral-programs.service';
import { Referral, ReferralStats } from './entities/referral.entity';
import { CreateReferralInput, ReferralCodeInput } from './dto/referral.dto';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => Referral)
export class ReferralProgramsResolver {
  constructor(
    private readonly referralProgramsService: ReferralProgramsService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Referral, { nullable: true })
  async referralByCode(@Args('input') input: ReferralCodeInput) {
    return this.referralProgramsService.findByCode(input.code);
  }

  /**
   * `user.sub` is the caller's `User.id` — `Referral.referrerId` is an
   * `Affiliate.id`. Must resolve the caller's affiliate profile first or
   * this always misses (see GAP-004).
   */
  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Referral])
  async myReferrals(@CurrentUser() user: AuthenticatedUser) {
    const own = await this.affiliatesService.findByUserId(user.sub);
    if (!own) return [];
    return this.referralProgramsService.findByReferrer(own.id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => ReferralStats)
  async myReferralStats(@CurrentUser() user: AuthenticatedUser) {
    const own = await this.affiliatesService.findByUserId(user.sub);
    if (!own) {
      return { affiliateId: '', referralCode: '', referredCount: 0 };
    }
    return this.referralProgramsService.stats(own.id);
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

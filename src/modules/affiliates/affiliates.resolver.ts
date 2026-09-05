import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliatesService } from './affiliates.service';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Resolver(() => Affiliate)
export class AffiliatesResolver {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.AFFILIATE)
  @Query(() => Affiliate, { nullable: true })
  async myAffiliateProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.affiliatesService.findByUserId(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => Affiliate, { nullable: true })
  async affiliate(@Args('id', { type: () => String }) id: string) {
    return this.affiliatesService.findByUserId(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [Affiliate])
  async affiliates() {
    return this.affiliatesService.findAll();
  }
}

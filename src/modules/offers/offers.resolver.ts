import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { OffersService } from './offers.service';
import { Offer } from './entities/offer.entity';
import {
  CreateOfferInput,
  UpdateOfferInput,
  ApproveOfferInput,
} from './dto/offer.dto';

@Resolver(() => Offer)
export class OffersResolver {
  constructor(private readonly offersService: OffersService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [Offer])
  async offers() {
    return this.offersService.findAll();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => Offer, { nullable: true })
  async offer(@Args('id') id: string) {
    return this.offersService.findOne(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Offer)
  async createOffer(@Args('input') input: CreateOfferInput) {
    return this.offersService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Offer)
  async updateOffer(
    @Args('id') id: string,
    @Args('input') input: UpdateOfferInput,
  ) {
    return this.offersService.update(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Offer)
  async approveOffer(@Args('input') input: ApproveOfferInput) {
    return this.offersService.approve(input);
  }
}

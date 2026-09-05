import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { AffiliateGroupsService } from './affiliate-groups.service';
import {
  AffiliateGroup,
  AffiliateGroupMember,
} from './entities/affiliate-group.entity';
import {
  CreateAffiliateGroupInput,
  UpdateAffiliateGroupInput,
  AddGroupMemberInput,
} from './dto/affiliate-group.dto';

@Resolver(() => AffiliateGroup)
export class AffiliateGroupsResolver {
  constructor(
    private readonly affiliateGroupsService: AffiliateGroupsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [AffiliateGroup])
  async affiliateGroups() {
    return this.affiliateGroupsService.findAll();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => AffiliateGroup, { nullable: true })
  async affiliateGroup(@Args('id') id: string) {
    return this.affiliateGroupsService.findOne(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => AffiliateGroup)
  async createAffiliateGroup(@Args('input') input: CreateAffiliateGroupInput) {
    return this.affiliateGroupsService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => AffiliateGroup)
  async updateAffiliateGroup(
    @Args('id') id: string,
    @Args('input') input: UpdateAffiliateGroupInput,
  ) {
    return this.affiliateGroupsService.update(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => AffiliateGroupMember)
  async addGroupMember(@Args('input') input: AddGroupMemberInput) {
    return this.affiliateGroupsService.addMember(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Boolean)
  async removeGroupMember(
    @Args('groupId') groupId: string,
    @Args('affiliateId') affiliateId: string,
  ) {
    await this.affiliateGroupsService.removeMember(groupId, affiliateId);
    return true;
  }
}

import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesExact } from '../../common/decorators/roles.decorator';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { AdvertisersService } from '../advertisers/advertisers.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Campaign } from './entities/campaign.entity';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignInput } from './dto/create-campaign.input';
import { UpdateCampaignInput } from './dto/update-campaign.input';
import { CampaignFilterInput } from './dto/filter-campaigns.input';

@Resolver(() => Campaign)
export class CampaignsResolver {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly advertisersService: AdvertisersService,
  ) {}

  /**
   * List campaigns. Advertisers see only their own; staff+ see all.
   * `my` boolean forces owner-scoped listing for staff too (super-admin tools).
   */
  @Roles(
    UserRole.STAFF,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADVERTISER,
  )
  @Query(() => [Campaign], { name: 'campaigns' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Args('filter', { type: () => CampaignFilterInput, nullable: true })
    filter?: CampaignFilterInput,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip?: number,
    @Args('take', { type: () => Int, defaultValue: 20 }) take?: number,
    @Args('my', { type: () => Boolean, nullable: true }) my?: boolean,
  ): Promise<Campaign[]> {
    const isStaff =
      user.role !== UserRole.ADVERTISER && user.role !== UserRole.AFFILIATE;

    let advertiserId: string | null = null;
    if (!isStaff || my) {
      const own = await this.advertisersService.findByUserId(user.sub);
      if (!own) {
        throw new ForbiddenException('No advertiser profile on this user.');
      }
      advertiserId = own.id;
    }

    const { items } = await this.campaignsService.findMany(
      advertiserId,
      filter ?? {},
      skip ?? 0,
      take ?? 20,
    );
    return items.map((c) => this.campaignsService.toDto(c) as Campaign);
  }

  @Roles(
    UserRole.STAFF,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADVERTISER,
  )
  @Query(() => Int, { name: 'campaignsCount' })
  async count(
    @CurrentUser() user: AuthenticatedUser,
    @Args('filter', { type: () => CampaignFilterInput, nullable: true })
    filter?: CampaignFilterInput,
    @Args('my', { type: () => Boolean, nullable: true }) my?: boolean,
  ): Promise<number> {
    const isStaff =
      user.role !== UserRole.ADVERTISER && user.role !== UserRole.AFFILIATE;

    let advertiserId: string | null = null;
    if (!isStaff || my) {
      const own = await this.advertisersService.findByUserId(user.sub);
      if (!own) return 0;
      advertiserId = own.id;
    }

    const { total } = await this.campaignsService.findMany(
      advertiserId,
      filter ?? {},
      0,
      1,
    );
    return total;
  }

  @Roles(
    UserRole.STAFF,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADVERTISER,
  )
  @Query(() => Campaign, { name: 'campaign' })
  async byId(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Campaign> {
    const c = await this.campaignsService.findById(id);
    if (!c) throw new NotFoundException('Campaign not found.');
    await this.assertCanRead(user, c.advertiserId);
    return this.campaignsService.toDto(c) as Campaign;
  }

  @RolesExact(UserRole.ADVERTISER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Mutation(() => Campaign, { name: 'createCampaign' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateCampaignInput,
  ): Promise<Campaign> {
    const own = await this.advertisersService.findByUserId(user.sub);
    if (!own) {
      throw new BadRequestException(
        'No advertiser profile is linked to this account.',
      );
    }
    if (input.startDate && input.endDate) {
      if (new Date(input.endDate) <= new Date(input.startDate)) {
        throw new BadRequestException('endDate must be after startDate.');
      }
    }
    // Service returns the campaign WITH its nested payouts/caps/remarks
    // in one round-trip — no follow-up findById here.
    const created = await this.campaignsService.create(own.id, input);
    return this.campaignsService.toDto(created) as Campaign;
  }

  @RolesExact(UserRole.ADVERTISER)
  @Mutation(() => Campaign, { name: 'updateCampaign' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateCampaignInput,
  ): Promise<Campaign> {
    const existing = await this.campaignsService.findById(input.id);
    if (!existing) throw new NotFoundException('Campaign not found.');
    await this.assertCanWrite(user, existing.advertiserId);
    const updated = await this.campaignsService.update(input);
    return this.campaignsService.toDto(updated) as Campaign;
  }

  @RolesExact(UserRole.ADVERTISER)
  @Mutation(() => Campaign, { name: 'toggleCampaignStatus' })
  async toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Campaign> {
    const existing = await this.campaignsService.findById(id);
    if (!existing) throw new NotFoundException('Campaign not found.');
    await this.assertCanWrite(user, existing.advertiserId);
    const updated = await this.campaignsService.toggleStatus(id);
    return this.campaignsService.toDto(updated) as Campaign;
  }

  @RolesExact(UserRole.ADVERTISER)
  @Mutation(() => Campaign, { name: 'softDeleteCampaign' })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Campaign> {
    const existing = await this.campaignsService.findById(id);
    if (!existing) throw new NotFoundException('Campaign not found.');
    await this.assertCanWrite(user, existing.advertiserId);
    const updated = await this.campaignsService.softDelete(id);
    return this.campaignsService.toDto(updated) as Campaign;
  }

  private async assertCanRead(
    user: AuthenticatedUser,
    advertiserId: string,
  ): Promise<void> {
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.STAFF
    ) {
      return;
    }
    if (user.role === UserRole.ADVERTISER) {
      const own = await this.advertisersService.findByUserId(user.sub);
      if (own && own.id === advertiserId) return;
    }
    throw new ForbiddenException('Not allowed to read this campaign.');
  }

  private async assertCanWrite(
    user: AuthenticatedUser,
    advertiserId: string,
  ): Promise<void> {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return;
    }
    if (user.role === UserRole.ADVERTISER) {
      const own = await this.advertisersService.findByUserId(user.sub);
      if (own && own.id === advertiserId) return;
    }
    throw new ForbiddenException('Not allowed to modify this campaign.');
  }
}

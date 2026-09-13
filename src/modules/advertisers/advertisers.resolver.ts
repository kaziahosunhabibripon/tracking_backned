import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { Prisma, UserRole } from '@prisma/client';
import { Roles, RolesExact } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/errors/app.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Advertiser } from './entities/advertiser.entity';
import { CreateAdvertiserInput } from './dto/create-advertiser.input';
import { UpdateAdvertiserInput } from './dto/update-advertiser.input';
import { AdvertiserFilterInput } from './dto/filter-advertisers.input';
import { AdvertisersService } from './advertisers.service';

@Resolver(() => Advertiser)
export class AdvertisersResolver {
  constructor(
    private readonly advertisersService: AdvertisersService,
    private readonly prisma: PrismaService,
  ) {}

  /** Super-admin / admin / manager list view. */
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Query(() => [Advertiser], { name: 'advertisers' })
  async list(
    @Args('filter', { type: () => AdvertiserFilterInput, nullable: true })
    filter?: AdvertiserFilterInput,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip?: number,
    @Args('take', { type: () => Int, defaultValue: 20 }) take?: number,
  ): Promise<Advertiser[]> {
    const { items } = await this.advertisersService.findMany(
      filter ?? {},
      skip ?? 0,
      take ?? 20,
    );
    return items.map((a) => this.advertisersService.toDto(a));
  }

  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Query(() => Int, { name: 'advertisersCount' })
  async count(
    @Args('filter', { type: () => AdvertiserFilterInput, nullable: true })
    filter?: AdvertiserFilterInput,
  ): Promise<number> {
    const { total } = await this.advertisersService.findMany(
      filter ?? {},
      0,
      1,
    );
    return total;
  }

  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Query(() => Advertiser, { name: 'advertiser' })
  async byId(@Args('id', { type: () => ID }) id: string): Promise<Advertiser> {
    const adv = await this.advertisersService.findById(id);
    if (!adv) throw new NotFoundException('Advertiser not found.');
    return this.advertisersService.toDto(adv);
  }

  /** The signed-in advertiser reads their own profile (or super-admin reads anyone's). */
  @RolesExact(
    UserRole.ADVERTISER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
  )
  @Query(() => Advertiser, { name: 'myAdvertiserProfile' })
  async mine(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID, nullable: true }) id?: string,
  ): Promise<Advertiser> {
    if (id) {
      if (user.role === UserRole.ADVERTISER) {
        throw new UnauthorizedException(
          'Advertisers can only read their own profile.',
        );
      }
      const adv = await this.advertisersService.findById(id);
      if (!adv) throw new NotFoundException('Advertiser not found.');
      return this.advertisersService.toDto(adv);
    }
    const adv = await this.advertisersService.findByUserId(user.sub);
    if (!adv) {
      throw new NotFoundException('No advertiser profile for this user.');
    }
    return this.advertisersService.toDto(adv);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Mutation(() => Advertiser, { name: 'createAdvertiser' })
  async create(
    @Args('input') input: CreateAdvertiserInput,
  ): Promise<Advertiser> {
    try {
      const adv = await this.advertisersService.create(input);
      return this.advertisersService.toDto(adv);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email or referral code already in use.');
      }
      throw err;
    }
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => Advertiser, { name: 'updateAdvertiser' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateAdvertiserInput,
  ): Promise<Advertiser> {
    const existing = await this.advertisersService.findById(input.id);
    if (!existing) throw new NotFoundException('Advertiser not found.');
    this.assertCanWrite(user, existing);
    const adv = await this.advertisersService.update(input);
    return this.advertisersService.toDto(adv);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Mutation(() => Advertiser, { name: 'softDeleteAdvertiser' })
  async softDelete(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Advertiser> {
    const adv = await this.advertisersService.softDelete(id);
    return this.advertisersService.toDto(adv);
  }

  /**
   * SUPER_ADMIN/ADMIN can write any advertiser. A MANAGER can only write
   * advertisers assigned to them (`Advertiser.managerId`) — mirrors
   * CampaignsResolver.assertCanWrite. `softDeleteAdvertiser` doesn't need
   * this: MANAGER isn't in its @Roles list at all.
   */
  private assertCanWrite(
    user: AuthenticatedUser,
    advertiser: { managerId: string | null },
  ): void {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return;
    }
    if (user.role === UserRole.MANAGER && advertiser.managerId === user.sub) {
      return;
    }
    throw new ForbiddenException('Not allowed to modify this advertiser.');
  }
}

import { Injectable, Scope } from '@nestjs/common';
import {
  Advertiser as PrismaAdvertiser,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateAdvertiserInput } from './dto/create-advertiser.input';
import { AdvertiserFilterInput } from './dto/filter-advertisers.input';
import { UpdateAdvertiserInput } from './dto/update-advertiser.input';

/**
 * Request-scoped so the per-request memoization below doesn't leak
 * across HTTP requests. `findByUserId` is called from multiple
 * resolvers in a single request (campaigns list + campaigns count
 * both need the caller's advertiser id) and Prisma would otherwise
 * hit Postgres twice for the same row.
 */
@Injectable({ scope: Scope.REQUEST })
export class AdvertisersService {
  private readonly ownAdvertiserCache = new Map<
    string,
    PrismaAdvertiser | null
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Admin-side create: spins up a User (role=ADVERTISER) and an Advertiser
   * profile in one transaction so we never leave a user without a profile
   * or vice versa. The referral code is unique-per-network and auto-derived
   * from the company name + a short cuid suffix if not provided.
   */
  async create(input: CreateAdvertiserInput): Promise<PrismaAdvertiser> {
    await this.usersService.assertEmailAvailable(input.email);
    const hashedPassword = await this.usersService.hashPassword(input.password);

    const referralCode =
      input.referralCode ??
      `ADV-${input.companyName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: UserRole.ADVERTISER,
          emailVerifiedAt: new Date(),
          isActive: true,
        },
      });

      return tx.advertiser.create({
        data: {
          userId: user.id,
          companyName: input.companyName,
          phone: input.phone,
          country: input.country,
          managerId: input.managerId ?? null,
          contactMethod: input.contactMethod ?? null,
          contactId: input.contactId ?? null,
          description: input.description ?? null,
          commissionRate:
            input.commissionRate !== undefined && input.commissionRate !== null
              ? new Prisma.Decimal(input.commissionRate)
              : null,
          payoutMethod: input.payoutMethod ?? null,
          referralCode,
          status: input.status ?? undefined,
        },
      });
    });
  }

  async update(input: UpdateAdvertiserInput): Promise<PrismaAdvertiser> {
    const { id, password: _password, ...rest } = input;
    void _password;

    const data: Prisma.AdvertiserUpdateInput = {
      companyName: rest.companyName,
      phone: rest.phone,
      country: rest.country,
      contactMethod: rest.contactMethod,
      contactId: rest.contactId,
      description: rest.description,
      payoutMethod: rest.payoutMethod,
      status: rest.status,
    };
    if (rest.managerId !== undefined) {
      data.manager =
        rest.managerId === null
          ? { disconnect: true }
          : { connect: { id: rest.managerId } };
    }
    if (rest.referralCode !== undefined) {
      data.referralCode = rest.referralCode;
    }
    if (rest.commissionRate !== undefined) {
      data.commissionRate =
        rest.commissionRate === null
          ? null
          : new Prisma.Decimal(rest.commissionRate);
    }

    return this.prisma.advertiser.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<PrismaAdvertiser | null> {
    return this.prisma.advertiser.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<PrismaAdvertiser | null> {
    const cached = this.ownAdvertiserCache.get(userId);
    if (cached !== undefined) return cached;
    const fresh = await this.prisma.advertiser.findUnique({
      where: { userId },
    });
    this.ownAdvertiserCache.set(userId, fresh);
    return fresh;
  }

  async findMany(
    filter: AdvertiserFilterInput,
    skip: number,
    take: number,
  ): Promise<{ items: PrismaAdvertiser[]; total: number }> {
    const where = this.buildWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.advertiser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.advertiser.count({ where }),
    ]);
    return { items, total };
  }

  async softDelete(id: string): Promise<PrismaAdvertiser> {
    return this.prisma.advertiser.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  private buildWhere(
    filter: AdvertiserFilterInput,
  ): Prisma.AdvertiserWhereInput {
    const where: Prisma.AdvertiserWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.managerId) where.managerId = filter.managerId;
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { companyName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  /**
   * Prisma returns Decimal for `commissionRate`; the GraphQL Advertiser type
   * exposes it as a string (so JS clients never lose precision). Centralize
   * the conversion here so resolvers don't all re-do it.
   */
  toDto(adv: PrismaAdvertiser): {
    id: string;
    userId: string;
    companyName: string;
    phone: string;
    country: string;
    managerId: string | null;
    contactMethod: PrismaAdvertiser['contactMethod'];
    contactId: string | null;
    description: string | null;
    commissionRate: string | null;
    payoutMethod: string | null;
    referralCode: string | null;
    status: PrismaAdvertiser['status'];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      ...adv,
      commissionRate:
        adv.commissionRate === null ? null : adv.commissionRate.toFixed(2),
    };
  }
}

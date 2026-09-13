import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';
import {
  CreateAffiliateGroupInput,
  UpdateAffiliateGroupInput,
  AddGroupMemberInput,
} from './dto/affiliate-group.dto';

@Injectable()
export class AffiliateGroupsService {
  private readonly logger = new Logger(AffiliateGroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAffiliateGroupInput) {
    this.logger.log(`Creating affiliate group: ${input.name}`);
    return this.prisma.affiliateGroup.create({
      data: {
        name: input.name,
        description: input.description,
        budget: input.budget,
        tags: input.tags ?? [],
      },
    });
  }

  async update(id: string, input: UpdateAffiliateGroupInput) {
    try {
      return await this.prisma.affiliateGroup.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          budget: input.budget,
          tags: input.tags,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Affiliate group not found.');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.affiliateGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { members: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.affiliateGroup.findUnique({
      where: { id },
      include: { members: true },
    });
  }

  async addMember(input: AddGroupMemberInput) {
    try {
      return await this.prisma.affiliateGroupMember.create({
        data: {
          groupId: input.groupId,
          affiliateId: input.affiliateId,
          role: input.role ?? 'MEMBER',
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This affiliate is already a member of this group.',
        );
      }
      throw err;
    }
  }

  async removeMember(groupId: string, affiliateId: string) {
    try {
      return await this.prisma.affiliateGroupMember.delete({
        where: {
          groupId_affiliateId: {
            groupId,
            affiliateId,
          },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Group membership not found.');
      }
      throw err;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
    return this.prisma.affiliateGroup.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        budget: input.budget,
        tags: input.tags,
      },
    });
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
    return this.prisma.affiliateGroupMember.create({
      data: {
        groupId: input.groupId,
        affiliateId: input.affiliateId,
        role: input.role ?? 'MEMBER',
      },
    });
  }

  async removeMember(groupId: string, affiliateId: string) {
    return this.prisma.affiliateGroupMember.delete({
      where: {
        groupId_affiliateId: {
          groupId,
          affiliateId,
        },
      },
    });
  }
}

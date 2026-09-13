/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import {
  CreateSupportTicketInput,
  UpdateSupportTicketInput,
} from './dto/support-ticket.dto';

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSupportTicketInput, userId: string) {
    this.logger.log(`Creating support ticket: ${input.subject}`);
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: input.subject,
        description: input.description,
        priority: input.priority ?? 'MEDIUM',
      },
    });
  }

  async update(id: string, input: UpdateSupportTicketInput) {
    const data: any = {};
    if (input.priority) data.priority = input.priority;
    if (input.status) {
      data.status = input.status;
      if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
        data.resolvedAt = new Date();
      }
    }
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;

    try {
      return await this.prisma.supportTicket.update({
        where: { id },
        data,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Support ticket not found.');
      }
      throw err;
    }
  }

  async findMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.supportTicket.findUnique({ where: { id } });
  }
}

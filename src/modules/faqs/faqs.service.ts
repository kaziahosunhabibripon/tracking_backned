import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import { CreateFaqInput, UpdateFaqInput } from './dto/faq.dto';

@Injectable()
export class FaqsService {
  private readonly logger = new Logger(FaqsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFaqInput) {
    this.logger.log(`Creating FAQ: ${input.question.slice(0, 50)}`);
    return this.prisma.faq.create({
      data: {
        question: input.question,
        answer: input.answer,
        category: input.category,
        sortOrder: input.sortOrder ?? 0,
        isPublished: input.isPublished ?? true,
      },
    });
  }

  async update(id: string, input: UpdateFaqInput) {
    try {
      return await this.prisma.faq.update({
        where: { id },
        data: {
          question: input.question,
          answer: input.answer,
          category: input.category,
          sortOrder: input.sortOrder,
          isPublished: input.isPublished,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('FAQ not found.');
      }
      throw err;
    }
  }

  async findAll(publishedOnly = false) {
    return this.prisma.faq.findMany({
      where: publishedOnly ? { isPublished: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.faq.findUnique({ where: { id } });
  }

  async remove(id: string) {
    try {
      return await this.prisma.faq.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('FAQ not found.');
      }
      throw err;
    }
  }
}

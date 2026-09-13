import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import {
  CreateSignupQuestionInput,
  UpdateSignupQuestionInput,
} from './dto/signup-question.dto';

@Injectable()
export class SignupQuestionsService {
  private readonly logger = new Logger(SignupQuestionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSignupQuestionInput) {
    this.logger.log(`Creating signup question: ${input.label}`);
    return this.prisma.signupQuestion.create({
      data: {
        label: input.label,
        type: input.type ?? 'text',
        options: input.options,
        required: input.required ?? false,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: UpdateSignupQuestionInput) {
    try {
      return await this.prisma.signupQuestion.update({
        where: { id },
        data: {
          label: input.label,
          type: input.type,
          options: input.options,
          required: input.required,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Signup question not found.');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.signupQuestion.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.signupQuestion.findUnique({ where: { id } });
  }

  async remove(id: string) {
    try {
      return await this.prisma.signupQuestion.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Signup question not found.');
      }
      throw err;
    }
  }
}

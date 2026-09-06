import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
    return this.prisma.signupQuestion.update({
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
    return this.prisma.signupQuestion.delete({ where: { id } });
  }
}

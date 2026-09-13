import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import {
  CreateCrExperimentInput,
  UpdateCrExperimentInput,
} from './dto/cr-experiment.dto';

@Injectable()
export class CrOptimizerService {
  private readonly logger = new Logger(CrOptimizerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCrExperimentInput) {
    this.logger.log(`Creating CR experiment: ${input.name}`);
    return this.prisma.crExperiment.create({
      data: {
        offerId: input.offerId,
        name: input.name,
        description: input.description,
        status: input.status ?? 'ACTIVE',
        metadata: input.metadata,
      },
    });
  }

  async update(id: string, input: UpdateCrExperimentInput) {
    try {
      return await this.prisma.crExperiment.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          metadata: input.metadata,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('CR experiment not found.');
      }
      throw err;
    }
  }

  async findByOffer(offerId: string) {
    return this.prisma.crExperiment.findMany({
      where: { offerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.crExperiment.findUnique({ where: { id } });
  }

  async remove(id: string) {
    try {
      return await this.prisma.crExperiment.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('CR experiment not found.');
      }
      throw err;
    }
  }
}

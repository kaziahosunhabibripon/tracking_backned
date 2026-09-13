import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/errors/app.exception';
import { UpsertSettingInput } from './dto/setting.dto';

export interface SettingsQueryInput {
  keys?: string[];
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(input?: SettingsQueryInput) {
    const where = input?.keys?.length ? { key: { in: input.keys } } : undefined;
    return this.prisma.setting.findMany({ where });
  }

  async findByKey(key: string) {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async upsert(input: UpsertSettingInput) {
    this.logger.log(`Upserting setting: ${input.key}`);
    return this.prisma.setting.upsert({
      where: { key: input.key },
      update: { value: input.value },
      create: { key: input.key, value: input.value },
    });
  }

  async remove(key: string) {
    try {
      return await this.prisma.setting.delete({ where: { key } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Setting not found.');
      }
      throw err;
    }
  }
}

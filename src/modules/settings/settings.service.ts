import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
    return this.prisma.setting.delete({ where: { key } });
  }
}

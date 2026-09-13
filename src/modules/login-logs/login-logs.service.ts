import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface RecordLoginInput {
  userId: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

/** Hard ceiling on `limit` args so a caller can't request an unbounded page. */
const MAX_LIMIT = 200;

@Injectable()
export class LoginLogsService {
  private readonly logger = new Logger(LoginLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordLoginInput) {
    return this.prisma.loginLog.create({
      data: {
        userId: input.userId,
        ip: input.ip,
        userAgent: input.userAgent,
        success: input.success,
        failureReason: input.failureReason,
      },
    });
  }

  async findForUser(userId: string, limit = 50) {
    return this.prisma.loginLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, MAX_LIMIT),
    });
  }

  async findAll(limit = 100) {
    return this.prisma.loginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, MAX_LIMIT),
    });
  }
}

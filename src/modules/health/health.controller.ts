import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

/**
 * Unauthenticated infra probes (load balancer / container orchestrator).
 * Liveness never touches the DB — a slow DB should trigger a readiness
 * failure, not a process restart.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['/', 'live'])
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is not reachable.');
    }
    return { status: 'ok' };
  }
}

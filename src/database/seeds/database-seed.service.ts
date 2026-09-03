import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../../modules/users/users.service';
import { AdvertiserStatus } from '@prisma/client';

/**
 * Auto-runs on application bootstrap (after Prisma + config are ready)
 * and again on-demand via `npm run seed:run`. The super-admin path is
 * env-gated (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) and skipped silently when
 * those vars are missing — a missing seed input must never fail a boot.
 *
 * Phase 2.6 also seeds a manager, an advertiser, and one sample campaign
 * (when `SEED_SAMPLE=true`) so the advertiser-dashboard has something to
 * render end-to-end without going through the Add Advertiser form first.
 */
@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.run();
  }

  async run(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (adminEmail && adminPassword) {
      await this.usersService.ensureUser({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      });
      this.logger.log(`Super-admin seed ensured for ${adminEmail}`);
    } else {
      this.logger.warn(
        'Skipping super-admin seed — ADMIN_EMAIL/ADMIN_PASSWORD not set.',
      );
    }

    if (this.configService.get<string>('SEED_SAMPLE') === 'true') {
      await this.seedSampleData();
    }
  }

  private async seedSampleData(): Promise<void> {
    const manager = await this.usersService.ensureUser({
      email: 'manager@example.com',
      password: 'Test123!@#',
      firstName: 'Manager',
      lastName: 'One',
      role: UserRole.MANAGER,
    });
    this.logger.log(`Manager seed ensured: ${manager.email}`);

    const advertiserUser = await this.usersService.ensureUser({
      email: 'advertiser@example.com',
      password: 'Test123!@#',
      firstName: 'AffiliatePro',
      lastName: 'Ads',
      role: UserRole.ADVERTISER,
    });
    this.logger.log(`Advertiser user seed ensured: ${advertiserUser.email}`);

    const existingAdvertiser = await this.prisma.advertiser.findUnique({
      where: { userId: advertiserUser.id },
    });
    if (!existingAdvertiser) {
      await this.prisma.advertiser.create({
        data: {
          userId: advertiserUser.id,
          companyName: 'AffiliatePro Ads',
          phone: '+1234567890',
          country: 'US',
          managerId: manager.id,
          commissionRate: new Prisma.Decimal('15.00'),
          payoutMethod: 'BANK_TRANSFER',
          referralCode: 'AFFILIATEPRO-ADS',
          status: AdvertiserStatus.ACTIVE,
        },
      });
      this.logger.log('Advertiser profile seed ensured.');
    }

    const advertiser = await this.prisma.advertiser.findUnique({
      where: { userId: advertiserUser.id },
    });
    if (advertiser) {
      const existingCampaign = await this.prisma.campaign.findFirst({
        where: { advertiserId: advertiser.id, name: 'White Bridge Main' },
      });
      if (!existingCampaign) {
        await this.prisma.campaign.create({
          data: {
            slug: 'white-bridge-main',
            advertiserId: advertiser.id,
            name: 'White Bridge Main',
            title: 'White Bridge Main - yib69hrj',
            description: 'Sample campaign seeded for development.',
            category: 'loan-and-finance',
            previewLink: 'https://example.com/preview',
            trackingLink: 'https://example.com/landing',
            partner: 'diceads-direct',
            costModel: 'CPA',
            defaultCost: new Prisma.Decimal('18.00'),
            currency: 'USD',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2030-01-31'),
            status: 'ACTIVE',
            geo: ['US', 'UK'],
            trafficAllowed: ['Banner Display', 'Native'],
          },
        });
        this.logger.log('Sample campaign seed ensured.');
      }
    }
  }
}

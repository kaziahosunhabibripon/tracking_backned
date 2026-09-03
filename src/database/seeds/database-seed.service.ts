import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UsersService } from '../../modules/users/users.service';

/**
 * Only route to a SUPER_ADMIN account — `registerAffiliate` (the public
 * `/sign-up` mutation) always creates an AFFILIATE, on purpose, so it can
 * never be used to mint an admin. Skips silently when the env vars are
 * absent — a missing seed input must never fail a boot or a deploy.
 */
@Injectable()
export class DatabaseSeedService {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async run(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'Skipping super-admin seed — ADMIN_EMAIL/ADMIN_PASSWORD not set.',
      );
      return;
    }

    await this.usersService.ensureUser({
      email: adminEmail,
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    });

    this.logger.log(`Super-admin seed ensured for ${adminEmail}`);
  }
}

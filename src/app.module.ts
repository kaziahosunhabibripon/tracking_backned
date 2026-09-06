import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import {
  getEnvFilePath,
  loadAppEnv,
  resolveAppEnvironment,
} from './config/env-paths';
import { validateEnv } from './config/env.validation';
import graphqlConfig from './config/graphql.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  depthLimit,
  fieldCountLimit,
} from './common/graphql/query-limits.rule';
import { RolesGuard } from './common/guards/roles.guard';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseSeedService } from './database/seeds/database-seed.service';
import { HealthModule } from './modules/health/health.module';
import { AdvertisersModule } from './modules/advertisers/advertisers.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { AuthModule } from './modules/auth/auth.module';
import { GqlJwtAuthGuard } from './modules/auth/guards/gql-jwt-auth.guard';
import { GqlThrottlerGuard } from './modules/auth/guards/gql-throttler.guard';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { FilesModule } from './modules/files/files.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BillingModule } from './modules/billing/billing.module';
import { OffersModule } from './modules/offers/offers.module';
import { AffiliateGroupsModule } from './modules/affiliate-groups/affiliate-groups.module';
import { AffiliatePaymentsModule } from './modules/affiliate-payments/affiliate-payments.module';
import { ReferralProgramsModule } from './modules/referral-programs/referral-programs.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { SignupQuestionsModule } from './modules/signup-questions/signup-questions.module';
import { LoginLogsModule } from './modules/login-logs/login-logs.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import './modules/affiliates/enums/affiliate.enums';
import './modules/advertisers/enums/advertiser.enums';
import './modules/campaigns/enums/campaign.enums';
import './modules/reports/enums/reports.enums';
import './modules/billing/enums/billing.enums';
import './modules/offers/enums/offer.enums';
import './modules/affiliate-payments/enums/affiliate-payment.enums';
import './modules/support-tickets/enums/support-ticket.enums';

// Populate process.env from the env file BEFORE module metadata evaluates —
// anything reading process.env at module scope (e.g. a module gating a queue
// on REDIS_URL) would otherwise see an empty env and decide wrongly for the
// whole process lifetime.
loadAppEnv();

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const header = req.headers['x-request-id'];
          const id =
            (Array.isArray(header) ? header[0] : header) ?? randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        level: resolveAppEnvironment() === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.token',
            '*.accessToken',
            '*.refreshToken',
          ],
          remove: true,
        },
        transport:
          resolveAppEnvironment() === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: getEnvFilePath(),
      load: [appConfig, authConfig, databaseConfig, graphqlConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get<number>('app.throttle.ttl') ?? 60) * 1000,
          limit: configService.get<number>('app.throttle.limit') ?? 120,
        },
      ],
    }),
    DatabaseModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = resolveAppEnvironment() === 'production';

        return {
          driver: ApolloDriver,
          path: configService.get<string>('graphql.path') ?? '/graphql',
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          // Hard-locked off in production regardless of GRAPHQL_INTROSPECTION —
          // an env file mistake must never expose the schema on a live API.
          introspection:
            !isProduction &&
            (configService.get<boolean>('graphql.introspection') ?? false),
          playground: !isProduction,
          graphiql: false,
          csrfPrevention: isProduction,
          includeStacktraceInErrorResponses: !isProduction,
          // Rate limits bound how MANY requests arrive; these bound how costly
          // a SINGLE one may be. Without them one nested query can pin the DB.
          validationRules: [depthLimit(), fieldCountLimit()],
          context: ({ req, res }: { req: unknown; res: unknown }) => ({
            req,
            res,
          }),
        };
      },
    }),
    MonitoringModule,
    HealthModule,
    UsersModule,
    AffiliatesModule,
    AdvertisersModule,
    CampaignsModule,
    FilesModule,
    TrackingModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
    BillingModule,
    OffersModule,
    AffiliateGroupsModule,
    AffiliatePaymentsModule,
    ReferralProgramsModule,
    FaqsModule,
    SignupQuestionsModule,
    LoginLogsModule,
    SupportTicketsModule,
    RolePermissionsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseSeedService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Guard order matters: throttle -> authenticate -> authorize.
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GqlJwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

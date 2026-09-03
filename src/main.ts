import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { loadAppEnv, resolveAppEnvironment } from './config/env-paths';
import { PrismaService } from './database/prisma.service';

async function bootstrap() {
  // Load the .env file BEFORE app.module is imported — a module's imports are
  // evaluated first, so anything reading process.env at module scope would
  // otherwise see an empty env and decide wrongly, permanently, for that process.
  loadAppEnv();
  // nodenext module resolution needs the emitted-JS extension even in a .ts
  // source file — this stays a dynamic import so app.module's own imports
  // (and anything they read from process.env at module scope) evaluate only
  // after loadAppEnv() has populated it.
  const { AppModule } = await import('./app.module.js');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  const isProduction = resolveAppEnvironment() === 'production';

  // We run behind exactly one reverse proxy in every deployed environment.
  // Without this, Express reports the proxy's IP as `req.ip` for every
  // visitor, and since rate limiting buckets by `req.ip`, the whole internet
  // would share one bucket. `1` = trust only the first hop — never `true`,
  // which would let a client forge an IP via X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // DEV ONLY: GraphQL Playground pulls its assets from a CDN. Production
      // keeps helmet's strict default and serves no explorer at all.
      contentSecurityPolicy: isProduction
        ? undefined
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://unpkg.com',
                'https://cdn.jsdelivr.net',
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://unpkg.com',
                'https://cdn.jsdelivr.net',
                'https://fonts.googleapis.com',
              ],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
              connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
            },
          },
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS origins come from FRONTEND_URL (comma-separated). Every browser
  // client needs listing: the super-admin dashboard AND the public site.
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];
  if (corsOrigins.length > 0) {
    logger.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
  } else if (isProduction) {
    logger.error(
      'FRONTEND_URL is not set — every browser request will fail CORS.',
    );
  } else {
    logger.warn('FRONTEND_URL is not set — allowing any origin (development).');
  }

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : !isProduction,
    credentials: true,
  });
  app.enableShutdownHooks();
  app.get(PrismaService).enableShutdownHooks(app);

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
}
void bootstrap();

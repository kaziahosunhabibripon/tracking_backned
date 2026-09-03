import cookieParser from 'cookie-parser';
import express from 'express';
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
  // Capture the raw body BEFORE body-parser mutates it so the postback
  // HMAC check can verify exactly what the sender signed. We only need
  // it for `application/json` (postback flow uses `application/x-www-form-
  // urlencoded`; for that we keep a string copy too).
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(
    express.urlencoded({
      limit: '1mb',
      extended: true,
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
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
  // NEVER use `origin: true` — that lets any site send authenticated
  // cross-origin requests; we only allow listed origins and the
  // credentials flag is set per-origin.
  const corsOrigins = (configService.get<string[]>('app.corsOrigins') ?? [])
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (corsOrigins.length > 0) {
    logger.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
  } else if (isProduction) {
    logger.error(
      'FRONTEND_URL is not set — every browser request will fail CORS.',
    );
  } else {
    logger.warn(
      'FRONTEND_URL is not set — refusing cross-origin requests (development).',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      // No Origin header (curl, server-to-server) is allowed — those don't
      // need CORS, only browser-initiated requests do.
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    maxAge: 86400,
  });
  app.enableShutdownHooks();
  app.get(PrismaService).enableShutdownHooks(app);

  const port = configService.get<number>('app.port') ?? 3000;
  // Bind to 127.0.0.1 by default so the dev server is NOT reachable from
  // the public internet (use 0.0.0.0 only behind a reverse proxy in prod
  // by setting BIND_HOST=0.0.0.0). Reduces attack surface while the
  // frontend + backend share the same dev box.
  const bindHost = process.env.BIND_HOST ?? '127.0.0.1';
  await app.listen(port, bindHost);
  logger.log(`API listening on http://${bindHost}:${port}`);
}
void bootstrap();

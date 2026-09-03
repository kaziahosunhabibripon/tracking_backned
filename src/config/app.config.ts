import { registerAs } from '@nestjs/config';
import { resolveAppEnvironment } from './env-paths';
import { toNumber, toStringArray } from './env.utils';

const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Tracking API',
  environment: resolveAppEnvironment(),
  port: toNumber(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Comma-separated allow-list — every browser client must be listed (the
  // super-admin dashboard AND the public tracking site). A missing origin
  // surfaces only as an opaque CORS error in the browser, so the effective
  // list is logged at boot (see main.ts).
  corsOrigins: toStringArray(process.env.FRONTEND_URL),
  throttle: {
    ttl: toNumber(process.env.THROTTLE_TTL, 60),
    limit: toNumber(process.env.THROTTLE_LIMIT, 120),
  },
}));

export default appConfig;

import { registerAs } from '@nestjs/config';

const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? '',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() ?? '',
}));

export default authConfig;

import { registerAs } from '@nestjs/config';
import { toBoolean } from './env.utils';

const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
  logging: toBoolean(process.env.DB_LOGGING),
}));

export default databaseConfig;

import { resolveAppEnvironment } from './env-paths';
import { toBoolean, toNumber } from './env.utils';

/**
 * Keys that MUST be present (non-empty) for the app to boot.
 * New integration keys (REDIS_URL, SENTRY_DSN, ...) are optional here and
 * validated in their own phase — they pass through untouched.
 */
const REQUIRED_KEYS = [
  'APP_NAME',
  'PORT',
  'FRONTEND_URL',
  'GRAPHQL_PATH',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'DATABASE_URL',
  'THROTTLE_TTL',
  'THROTTLE_LIMIT',
] as const;

const NUMERIC_KEYS = ['PORT', 'THROTTLE_TTL', 'THROTTLE_LIMIT'] as const;

const MIN_JWT_SECRET_LENGTH = 16;
const PLACEHOLDER_PATTERN = /replace-with|change-?me|example/i;

/** Safely coerce an env value to a string without risking `[object Object]`. */
function readString(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function isBlank(value: unknown): boolean {
  return readString(value).trim() === '';
}

function assertUrlIfPresent(value: unknown, key: string): void {
  if (isBlank(value)) {
    return;
  }
  try {
    new URL(readString(value));
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL.`);
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const isProduction = resolveAppEnvironment() === 'production';

  const missingKeys = REQUIRED_KEYS.filter((key) => isBlank(config[key]));
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
    );
  }

  const jwtSecret = readString(config.JWT_SECRET);
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters.`,
    );
  }
  if (isProduction && PLACEHOLDER_PATTERN.test(jwtSecret)) {
    throw new Error(
      'JWT_SECRET must not use a placeholder value in production.',
    );
  }
  if (!readString(config.DATABASE_URL).startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }

  // Optional integration URLs — validate format only if provided
  assertUrlIfPresent(config.REDIS_URL, 'REDIS_URL');
  assertUrlIfPresent(config.SENTRY_DSN, 'SENTRY_DSN');

  // Type coercion (numbers + booleans)
  const coerced: Record<string, unknown> = { ...config };
  for (const key of NUMERIC_KEYS) {
    coerced[key] = toNumber(readString(config[key]));
  }
  coerced.DB_LOGGING = toBoolean(readString(config.DB_LOGGING));
  coerced.GRAPHQL_INTROSPECTION = toBoolean(
    readString(config.GRAPHQL_INTROSPECTION),
  );

  return coerced;
}

/** Cookie names for the httpOnly auth cookies (single source, DRY). */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Tighter rate limit for auth mutations (vs the global default). */
export const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

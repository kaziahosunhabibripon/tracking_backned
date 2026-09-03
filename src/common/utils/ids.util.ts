import { createHash, randomBytes, randomUUID } from 'crypto';

/** A new UUID v4. */
export function generateId(): string {
  return randomUUID();
}

/** A cryptographically-random opaque token (hex). Used for refresh tokens —
 * store only its hash. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** SHA-256 hash of a token (store this, never the raw token). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

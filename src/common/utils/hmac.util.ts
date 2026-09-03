import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Constant-time HMAC-SHA256 verifier. The S2S postback path is the
 * single biggest attack surface (cheap to spam, can mint conversions),
 * so the signature check must be timing-safe — a simple `===` would
 * leak a byte-by-byte oracle.
 */
export function verifyHmacSha256(
  rawBody: string,
  signature: string | undefined | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Both sides must be the same length for `timingSafeEqual` to throw
  // — the early-return on length mismatch is fine for security because
  // the secret length is fixed and the signature length is deterministic.
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    return false;
  }
}

/**
 * Emails are case-insensitive in practice everywhere real mail providers run
 * (Gmail, Outlook, ...) — storing/comparing them as typed would let
 * "a@x.com" and "A@X.com" register as two different accounts and silently
 * fail to sign in on a case mismatch. Normalize once, at the DTO boundary, so
 * every other layer can treat `email` as already-canonical.
 */
export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/** Trims incidental leading/trailing whitespace from free-text input fields. */
export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Opaque offset cursors for pagination. The cursor hides the offset behind a
 * base64 token so clients treat it as opaque (Relay-style). Cursor-key
 * pagination for large tables can be added later for the endpoints that need it.
 */
const PREFIX = 'offset:';

export function encodeCursor(offset: number): string {
  return Buffer.from(`${PREFIX}${offset}`).toString('base64');
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const match = new RegExp(`^${PREFIX}(\\d+)$`).exec(decoded);
  return match ? Number(match[1]) : 0;
}

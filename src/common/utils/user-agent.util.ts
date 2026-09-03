import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  device: string | null;
  browser: string | null;
  os: string | null;
}

/**
 * Pure-function user-agent parser. `ua-parser-js` is allocated fresh per
 * call (cheap) so a single shared module keeps the API surface tiny.
 * The returned strings are short (≤32 chars) so they fit a Postgres
 * `varchar` index without truncation.
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) return { device: null, browser: null, os: null };
  const result = new UAParser(ua).getResult();
  return {
    device: result.device.type ?? null,
    browser: result.browser.name ?? null,
    os: result.os.name ?? null,
  };
}

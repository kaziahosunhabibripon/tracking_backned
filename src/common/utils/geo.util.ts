import geoip from 'geoip-lite';

export interface GeoLookup {
  country: string | null;
}

/**
 * Best-effort IP → ISO-3166 alpha-2 country lookup using the offline
 * `geoip-lite` dataset (bundled in `node_modules/geoip-lite`). Returns
 * `null` for private/loopback IPs and unknown addresses — never throws.
 *
 * Hot-path consideration: the lookup is in-memory (no network), so
 * safe to call on every click.
 */
export function lookupCountry(ip: string | undefined | null): string | null {
  if (!ip) return null;
  // geoip-lite returns null for non-public IPs (loopback, RFC1918, etc).
  const result = geoip.lookup(ip);
  return result?.country ?? null;
}

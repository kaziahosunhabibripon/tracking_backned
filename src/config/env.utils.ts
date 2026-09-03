export function toBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function toNumber(
  value: string | number | undefined,
  fallback?: number,
): number {
  const parsedValue = Number(value);

  if (!Number.isNaN(parsedValue)) {
    return parsedValue;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Invalid number value: ${String(value)}`);
}

export function toStringArray(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

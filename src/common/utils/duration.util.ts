/** Parse durations like `15m`, `12h`, `30d`, `45s` into seconds. */
export function durationToSeconds(
  value: string,
  fallbackSeconds = 900,
): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  switch (match[2]) {
    case 's':
      return amount;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    case 'm':
    default:
      return amount * 60;
  }
}

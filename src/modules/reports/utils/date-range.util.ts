export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(
  preset?: string,
  from?: string,
  to?: string,
): DateRange {
  if (preset && preset !== 'custom') {
    return resolvePreset(preset);
  }
  const f =
    from !== undefined && from.trim().length > 0
      ? new Date(from.trim())
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const t =
    to !== undefined && to.trim().length > 0 ? new Date(to.trim()) : new Date();
  return { from: f, to: t };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function resolvePreset(preset: string): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7d':
      return {
        from: startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        to: endOfDay(now),
      };
    case 'month': {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: m, to: endOfDay(now) };
    }
    case 'last-month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: first, to: endOfDay(last) };
    }
    default:
      return {
        from: startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        to: endOfDay(now),
      };
  }
}

import { formatMoney } from '@/lib/config';
import type { ValueFormat } from './types';

/** Render a KPI/point value for its declared format. */
export function formatValue(value: number, format: ValueFormat): string {
  if (format === 'money') return formatMoney(value);
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

/** Compact money for chart axes/tooltips, e.g. 8_400_000 → "8.4M". */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.round(value)}`;
}

/** Axis/tooltip formatter for a series value by its format. */
export function formatCompact(value: number, format: ValueFormat = 'number'): string {
  if (format === 'money') return compactMoney(value);
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

/** Signed percentage label for a delta, e.g. 0.124 → "+12.4%". */
export function formatDelta(delta: number): string {
  const pct = (delta * 100).toFixed(1);
  return `${delta >= 0 ? '+' : ''}${pct}%`;
}

/** x-axis label for an RPC bucket start date, formatted for its granularity. */
export function bucketLabel(iso: string, unit: 'day' | 'week' | 'month'): string {
  const d = new Date(iso);
  if (unit === 'month') return d.toLocaleDateString(undefined, { month: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** First→last fractional change of a numeric series, for a KPI delta. */
export function seriesDelta(rows: Array<Record<string, unknown>>, key: string): number | null {
  if (rows.length < 2) return null;
  const first = Number(rows[0][key]) || 0;
  const last = Number(rows[rows.length - 1][key]) || 0;
  if (first === 0) return null;
  return (last - first) / first;
}

/** Sum a numeric series key across rows. */
export function sumSeries(rows: Array<Record<string, unknown>>, key: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

/**
 * Fractional change between the first and second half of a series — a steadier
 * read than first-vs-last point, which a single quiet day can swing wildly.
 * Used for dashboard deltas, where the headline is a period total rather than
 * an end-of-period level. Returns null when there is too little to compare.
 */
export function halfPeriodDelta(rows: Array<Record<string, unknown>>, key: string): number | null {
  if (rows.length < 4) return null;
  const mid = Math.floor(rows.length / 2);
  const previous = sumSeries(rows.slice(0, mid), key);
  const current = sumSeries(rows.slice(mid), key);
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * Humanised age of a timestamp, e.g. "3d 4h". Drives the "oldest item waiting"
 * SLA read on queue cards, so admins can see backlog age at a glance.
 */
export function formatAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'under 1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

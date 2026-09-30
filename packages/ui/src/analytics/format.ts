import { formatAmount } from '../molecules/money';
import type { ValueFormat } from './types';

/** Render a KPI/point value for its declared format. */
export function formatValue(value: number, format: ValueFormat): string {
  if (format === 'money') return formatAmount(value);
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
 * an end-of-period level.
 *
 * Returns null rather than a number whenever the comparison would mislead:
 *
 *   - fewer than four buckets, so neither half is a meaningful sample;
 *   - an empty *older* half, which has no ratio at all;
 *   - an empty *newer* half, which is arithmetically -100% but reads as a
 *     collapse. For a low-volume vendor "one booking in the first fortnight and
 *     none since" is an ordinary month, not a business in freefall — and
 *     suppressing only that side would leave the badge able to report bad news
 *     and never good, since growth from zero is already null above.
 *
 * Callers render a caption of their own when this is null; see `Kpi.noDeltaLabel`.
 */
export function halfPeriodDelta(rows: Array<Record<string, unknown>>, key: string): number | null {
  if (rows.length < 4) return null;
  const mid = Math.floor(rows.length / 2);
  const previous = sumSeries(rows.slice(0, mid), key);
  const current = sumSeries(rows.slice(mid), key);
  // Symmetric by design: either half being empty means there is no honest
  // percentage to show, in either direction.
  if (previous === 0 || current === 0) return null;
  return (current - previous) / previous;
}

/**
 * Change in a *rate* between the two halves of a window — the second half's
 * numerator-over-denominator against the first half's.
 *
 * A rate cannot borrow its numerator's delta. "Resolution rate" moving with the
 * count of resolutions is a different claim from the rate itself moving: resolve
 * twice as many out of three times as many disputes and the count is up while
 * the rate is down. Nor can a rate be read per bucket, where a quiet bucket is
 * 0/0 and has no value at all — so each half is summed first, then divided.
 *
 * Null when there is too little to compare or either half has an empty
 * denominator, on the same reasoning as `halfPeriodDelta`.
 */
export function ratioDelta(
  rows: Array<Record<string, unknown>>,
  numerator: string,
  denominator: string,
): number | null {
  if (rows.length < 4) return null;
  const mid = Math.floor(rows.length / 2);
  const before = rows.slice(0, mid);
  const after = rows.slice(mid);

  const beforeDenom = sumSeries(before, denominator);
  const afterDenom = sumSeries(after, denominator);
  if (beforeDenom === 0 || afterDenom === 0) return null;

  const beforeRate = sumSeries(before, numerator) / beforeDenom;
  const afterRate = sumSeries(after, numerator) / afterDenom;
  if (beforeRate === 0) return null;
  return (afterRate - beforeRate) / beforeRate;
}

/**
 * The two comparisons a delta on this platform can mean, each with the caption
 * that names it and the sentence that explains it.
 *
 * Kept here beside the helpers that compute them so a surface cannot label a
 * `halfPeriodDelta` as anything else: the caption alone ("vs first half") has
 * been read as "against the previous period", which is not what any of these
 * helpers measure.
 */
export type Comparison = {
  /** Caption beside the badge. */
  label: string;
  /** Tooltip on that caption, spelling the comparison out. */
  hint: string;
};

/** For deltas from `halfPeriodDelta` or `ratioDelta` — the window's two halves. */
export const HALF_PERIOD: Comparison = {
  label: 'vs first half',
  hint: 'The second half of the selected window against its first half — for example days 16–30 against days 1–15 on a 30-day view. This is not a comparison against the previous period.',
};

/** For deltas from `seriesDelta` — levels, first bucket against last. */
export const PERIOD_START: Comparison = {
  label: 'vs period start',
  hint: 'Where this figure stands now against where it stood at the start of the selected window.',
};

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

import { titleize } from '@/lib/config';
import { statusColor } from '@/lib/status';
import type { BreakdownSlice, SeriesColor } from './types';

const SERIES_COLORS: SeriesColor[] = [
  'primary',
  'secondary',
  'success',
  'warning',
  'error',
  'info',
];

/**
 * `statusColor` can return 'default' (grey), which the theme has no `.main` for.
 * Coerce anything outside the chartable palette to 'info' so every slice
 * resolves to a real colour at render.
 */
export function toSeriesColor(raw: string): SeriesColor {
  return (SERIES_COLORS as string[]).includes(raw) ? (raw as SeriesColor) : 'info';
}

/**
 * Turn `{name, value}` status counts from an RPC into donut slices, titleised
 * and coloured by the app's status semantics. Zero-count entries are dropped so
 * a chart only ever shows what actually exists.
 */
export function toStatusSlices(rows: Array<{ name: string; value: number }>): BreakdownSlice[] {
  return rows
    .filter((r) => r.value > 0)
    .map((r) => ({
      name: titleize(r.name),
      value: r.value,
      color: toSeriesColor(statusColor(r.name)),
    }));
}

/**
 * Slices for categories that carry no status semantics — plan names, category
 * labels — coloured by cycling the palette in order. Names are already
 * human-authored, so unlike `toStatusSlices` they are not titleised.
 */
export function toSeriesSlices(rows: Array<{ name: string; value: number }>): BreakdownSlice[] {
  return rows
    .filter((r) => r.value > 0)
    .map((r, i) => ({
      name: r.name,
      value: r.value,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }));
}

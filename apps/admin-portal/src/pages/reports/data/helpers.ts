import { supabase } from '@/lib/supabase';
import { titleize } from '@/lib/config';
import { toSeriesColor } from '@/lib/analytics';
import type { BreakdownSlice } from '../schema';

/** Default marketplace currency (matches `formatMoney`'s fallback). */
export const CURRENCY = 'UGX';

// Palette coercion is shared with the dashboard's charts — see `@/lib/analytics`.
export { toSeriesColor };

// A head+count query resolves to a result carrying only `count` — same helper the
// global queries file uses, re-declared here so the reports data layer stays
// self-contained.
export const count = (q: PromiseLike<{ count: number | null }>): Promise<number> =>
  Promise.resolve(q).then((r) => r.count ?? 0);

/**
 * Count rows of `table` for each status value in parallel, returning a
 * distribution ready for a donut. `colorFor` maps a status to a palette slot so
 * the slice colours track the app's status semantics. Zero-count statuses are
 * dropped so the chart shows only what exists.
 */
export async function statusBreakdown(
  table: string,
  statuses: readonly string[],
  colorFor: (status: string) => string,
): Promise<BreakdownSlice[]> {
  const counts = await Promise.all(
    statuses.map((status) =>
      count(supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', status)),
    ),
  );
  return statuses
    .map((status, i) => ({
      name: titleize(status),
      value: counts[i],
      color: toSeriesColor(colorFor(status)),
    }))
    .filter((slice) => slice.value > 0);
}

/** Total rows of a table (soft-deleted rows still count unless the table filters). */
export function tableCount(table: string): Promise<number> {
  return count(supabase.from(table).select('id', { count: 'exact', head: true }));
}

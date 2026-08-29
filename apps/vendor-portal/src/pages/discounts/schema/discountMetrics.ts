import type { Kpi } from '@sinnapi/ui/analytics';
import type { DiscountModel, PromotionModel } from '@/lib/types';
import { discountStatus, type DiscountFilter, type DiscountStatus } from './discountStatus';

/** A code with its real state resolved and the campaign it prices named. */
export type DiscountRow = DiscountModel & {
  status: DiscountStatus;
  /** The title of the attached campaign, or null when the code stands alone. */
  promotionTitle: string | null;
};

/**
 * Joins each code to its campaign and resolves the state it is really in.
 *
 * The campaign is looked up through a map built once rather than a `.find()`
 * per card: a vendor with forty codes and forty campaigns would otherwise do
 * 1,600 comparisons on every tick of the clock.
 */
export function toDiscountRows(
  discounts: DiscountModel[],
  promotions: PromotionModel[],
  now: number,
): DiscountRow[] {
  const titleById = new Map(promotions.map((promotion) => [promotion.id, promotion.title]));

  return discounts.map((discount) => ({
    ...discount,
    status: discountStatus(discount, now),
    promotionTitle: discount.promotion_id ? (titleById.get(discount.promotion_id) ?? null) : null,
  }));
}

/** How many codes sit under each toolbar tab. */
export function toDiscountCounts(rows: DiscountRow[]): Record<DiscountFilter, number> {
  const counts: Record<DiscountFilter, number> = {
    all: rows.length,
    live: 0,
    scheduled: 0,
    exhausted: 0,
    paused: 0,
    ended: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/**
 * Whether a code answers the toolbar's search term.
 *
 * Matched against the code itself and the campaign it prices — the two things
 * a vendor knows a code by. An unnamed code is searchable as "automatic",
 * which is what the card calls it, so what is typed matches what is read.
 */
export function matchesDiscountTerm(row: DiscountRow, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [row.code ?? 'automatic', row.promotionTitle ?? ''].join(' ').toLowerCase();
  return haystack.includes(needle);
}

/**
 * The four figures above the grid.
 *
 * All deltas are null: nothing here is a period total, so there is no previous
 * period to compare against, and inventing one would put a green arrow next to
 * a number that did not move.
 *
 * Redemptions is the only outcome measure — the two counts either side of it
 * describe the pipeline that produces it. "Fully redeemed" earns the fourth
 * slot over a second pipeline figure because it is the only one of the five
 * states that asks the vendor for a decision: a code at its cap is turning
 * demand away, and raising the ceiling is a thing they can still do today.
 */
export function toDiscountKpis(rows: DiscountRow[]): Kpi[] {
  const counts = toDiscountCounts(rows);
  const redemptions = rows.reduce((total, row) => total + row.used_count, 0);

  return [
    { key: 'live', label: 'Live now', value: counts.live, format: 'number', delta: null },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: counts.scheduled,
      format: 'number',
      delta: null,
    },
    {
      key: 'redemptions',
      label: 'Redemptions',
      value: redemptions,
      format: 'number',
      delta: null,
    },
    {
      key: 'exhausted',
      label: 'Fully redeemed',
      value: counts.exhausted,
      format: 'number',
      delta: null,
    },
  ];
}

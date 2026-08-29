import type { Kpi } from '@sinnapi/ui/analytics';
import type { PromotionDiscountModel, PromotionModel } from '@/lib/types';
import { promotionStatus, type PromotionFilter, type PromotionStatus } from './promotionStatus';

/** A campaign with the codes attached to it and their redemptions resolved. */
export type PromotionRow = PromotionModel & {
  status: PromotionStatus;
  codes: PromotionDiscountModel[];
  /** Total redemptions across every code attached to this campaign. */
  redemptions: number;
};

/** Joins each campaign to its codes and resolves the state it is really in. */
export function toPromotionRows(
  promotions: PromotionModel[],
  discounts: PromotionDiscountModel[],
  now: number,
): PromotionRow[] {
  // Grouped once rather than filtered per card: a vendor with fifty campaigns
  // and fifty codes would otherwise do 2,500 comparisons on every render.
  const byPromotion = new Map<string, PromotionDiscountModel[]>();
  for (const discount of discounts) {
    const bucket = byPromotion.get(discount.promotion_id);
    if (bucket) bucket.push(discount);
    else byPromotion.set(discount.promotion_id, [discount]);
  }

  return promotions.map((promotion) => {
    const codes = byPromotion.get(promotion.id) ?? [];
    return {
      ...promotion,
      status: promotionStatus(promotion, now),
      codes,
      redemptions: codes.reduce((total, code) => total + (code.used_count ?? 0), 0),
    };
  });
}

/** How many campaigns sit under each toolbar tab. */
export function toPromotionCounts(rows: PromotionRow[]): Record<PromotionFilter, number> {
  const counts: Record<PromotionFilter, number> = {
    all: rows.length,
    live: 0,
    scheduled: 0,
    paused: 0,
    ended: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/**
 * The four figures above the grid.
 *
 * All deltas are null: nothing here is a period total, so there is no previous
 * period to compare against, and inventing one would put a green arrow next to
 * a number that did not move. Redemptions is the only outcome measure on the
 * screen — the other three describe the pipeline that produces it, which is
 * what a vendor is actually deciding about when they open this page.
 */
export function toPromotionKpis(rows: PromotionRow[]): Kpi[] {
  const counts = toPromotionCounts(rows);
  const codes = rows.reduce((total, row) => total + row.codes.length, 0);
  const redemptions = rows.reduce((total, row) => total + row.redemptions, 0);

  return [
    { key: 'live', label: 'Live now', value: counts.live, format: 'number', delta: null },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: counts.scheduled,
      format: 'number',
      delta: null,
    },
    { key: 'codes', label: 'Codes attached', value: codes, format: 'number', delta: null },
    {
      key: 'redemptions',
      label: 'Redemptions',
      value: redemptions,
      format: 'number',
      delta: null,
    },
  ];
}

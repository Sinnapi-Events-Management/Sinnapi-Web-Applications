import type { Kpi } from '@sinnapi/ui/analytics';
import type {
  OfferTargetModel,
  PackageModel,
  PromotionDiscountModel,
  PromotionModel,
  ServiceModel,
} from '@/lib/types';
import { targetSummary, toTargetKeys } from '@/components/offers/schema/offerTargets';
import { promotionStatus, type PromotionFilter, type PromotionStatus } from './promotionStatus';

/** A campaign with the codes attached to it and their redemptions resolved. */
export type PromotionRow = PromotionModel & {
  status: PromotionStatus;
  codes: PromotionDiscountModel[];
  /** Total redemptions across every code attached to this campaign. */
  redemptions: number;
  /**
   * What this campaign is an offer on, in one phrase.
   *
   * Every code under a campaign inherits this unless it names packages of its
   * own, so it is the campaign's scope that usually decides what a client
   * actually sees a saving on — which makes it the one thing about a campaign
   * this card could not say before targets existed.
   */
  coverage: string;
};

/** Joins each campaign to its codes and resolves the state it is really in. */
export function toPromotionRows(
  promotions: PromotionModel[],
  discounts: PromotionDiscountModel[],
  now: number,
  targets: OfferTargetModel[] = [],
  packages: PackageModel[] = [],
  services: ServiceModel[] = [],
): PromotionRow[] {
  // Grouped once rather than filtered per card: a vendor with fifty campaigns
  // and fifty codes would otherwise do 2,500 comparisons on every render.
  const byPromotion = new Map<string, PromotionDiscountModel[]>();
  for (const discount of discounts) {
    const bucket = byPromotion.get(discount.promotion_id);
    if (bucket) bucket.push(discount);
    else byPromotion.set(discount.promotion_id, [discount]);
  }

  // Grouped once, for the same reason the codes are.
  const targetsByPromotion = new Map<string, OfferTargetModel[]>();
  for (const target of targets) {
    if (!target.promotion_id) continue;
    const bucket = targetsByPromotion.get(target.promotion_id);
    if (bucket) bucket.push(target);
    else targetsByPromotion.set(target.promotion_id, [target]);
  }

  return promotions.map((promotion) => {
    const codes = byPromotion.get(promotion.id) ?? [];
    return {
      ...promotion,
      status: promotionStatus(promotion, now),
      codes,
      redemptions: codes.reduce((total, code) => total + (code.used_count ?? 0), 0),
      coverage: targetSummary(
        new Set(toTargetKeys(targetsByPromotion.get(promotion.id) ?? [])),
        packages,
        services,
      ),
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

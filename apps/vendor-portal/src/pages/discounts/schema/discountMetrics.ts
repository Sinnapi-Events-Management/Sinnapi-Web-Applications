import type { Kpi } from '@sinnapi/ui/analytics';
import type {
  DiscountModel,
  OfferTargetModel,
  PackageModel,
  PromotionModel,
  ServiceModel,
} from '@/lib/types';
import { targetSummary, toTargetKeys } from '@/components/offers/schema/offerTargets';
import { discountStatus, type DiscountFilter, type DiscountStatus } from './discountStatus';

/** A code with its real state resolved and the campaign it prices named. */
export type DiscountRow = DiscountModel & {
  status: DiscountStatus;
  /** The title of the attached campaign, or null when the code stands alone. */
  promotionTitle: string | null;
  /**
   * What this code covers, in one phrase.
   *
   * Resolved through the same one-way inheritance the database uses: the code's
   * own targets, else its campaign's, else everything the vendor sells. A card
   * that showed only the code's own rows would report "Everything you sell" for
   * a code correctly scoped by the campaign above it, which is the opposite of
   * the truth.
   */
  coverage: string;
  /** True when the coverage came from the campaign rather than the code itself. */
  coverageInherited: boolean;
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
  targets: OfferTargetModel[] = [],
  packages: PackageModel[] = [],
  services: ServiceModel[] = [],
): DiscountRow[] {
  const titleById = new Map(promotions.map((promotion) => [promotion.id, promotion.title]));

  // Grouped once rather than filtered per card: a vendor with forty codes and
  // two hundred targets would otherwise walk the whole target list forty times
  // on every tick of the clock.
  const byDiscount = new Map<string, OfferTargetModel[]>();
  const byPromotion = new Map<string, OfferTargetModel[]>();
  for (const target of targets) {
    const key = target.discount_id ?? target.promotion_id;
    if (!key) continue;
    const bucket = target.discount_id ? byDiscount : byPromotion;
    const existing = bucket.get(key);
    if (existing) existing.push(target);
    else bucket.set(key, [target]);
  }

  return discounts.map((discount) => {
    const own = byDiscount.get(discount.id) ?? [];
    const inherited = discount.promotion_id ? (byPromotion.get(discount.promotion_id) ?? []) : [];
    const effective = own.length > 0 ? own : inherited;

    return {
      ...discount,
      status: discountStatus(discount, now),
      promotionTitle: discount.promotion_id ? (titleById.get(discount.promotion_id) ?? null) : null,
      coverage: targetSummary(new Set(toTargetKeys(effective)), packages, services),
      coverageInherited: own.length === 0 && inherited.length > 0,
    };
  });
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

  // The name is searched too, and leads: a vendor looking for last season's
  // sale types "early bird", not the token they printed on the flyer.
  const haystack = [
    row.title ?? '',
    row.code ?? 'automatic',
    row.promotionTitle ?? '',
    row.coverage,
  ]
    .join(' ')
    .toLowerCase();
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

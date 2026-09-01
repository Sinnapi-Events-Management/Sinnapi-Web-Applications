import type { OfferModel } from '../types';

/**
 * One row of `vendor_package_offers`: an offer, and the package (and possibly
 * the tier) it lands on.
 *
 * `tier_id` null means every tier of that package. A tier-scoped offer arrives
 * as one row per tier it names.
 */
export type PackageOfferRow = OfferModel & {
  package_id: string;
  tier_id: string | null;
};

/**
 * The batch read, indexed by package.
 *
 * Built once per fetch rather than filtered per card: a vendor profile renders
 * six packages against a list that may hold thirty rows, and `.filter()` inside
 * a `.map()` is thirty comparisons per card on every re-render — including
 * every tier switch, which is the interaction this data is on screen for.
 */
export function groupOffersByPackage(
  rows: readonly PackageOfferRow[] | null | undefined,
): Map<string, PackageOfferRow[]> {
  const byPackage = new Map<string, PackageOfferRow[]>();
  for (const row of rows ?? []) {
    const bucket = byPackage.get(row.package_id);
    if (bucket) bucket.push(row);
    else byPackage.set(row.package_id, [row]);
  }
  return byPackage;
}

/**
 * The offers that apply to one tier of one package.
 *
 * A row with a null `tier_id` covers every tier; a row naming a tier covers
 * only that one. This is the browser's half of `offer_targets_package` — and it
 * is a lookup rather than a reimplementation, because the server already
 * resolved the inheritance and expressed the answer as rows.
 *
 * `tierId` null asks the package-level question: does anything here touch this
 * package at all. That is what a card needs before a tier is chosen, and it is
 * why a tier-scoped offer still contributes a badge to the package.
 *
 * Deduplicated by discount, because a tier-scoped offer covering three tiers
 * arrives as three rows and a package-level question would otherwise report one
 * discount three times.
 */
export function offersForTier(
  rows: readonly PackageOfferRow[] | null | undefined,
  tierId: string | null | undefined,
): PackageOfferRow[] {
  const seen = new Set<string>();
  const out: PackageOfferRow[] = [];

  for (const row of rows ?? []) {
    if (tierId != null && row.tier_id != null && row.tier_id !== tierId) continue;
    if (seen.has(row.discount_id)) continue;
    seen.add(row.discount_id);
    out.push(row);
  }
  return out;
}

/**
 * The best headline saving across a whole package, for a card that has no tier
 * on screen — a search result, a grid tile, a vendor directory entry.
 *
 * Returns the offer with the largest advertised value rather than the largest
 * money saving, because a card at this level has no priced tier to compute a
 * saving against. Percentages beat fixed amounts on a tie only because "20%
 * off" is the more legible claim at a glance; both are shown truthfully by
 * `offerHeadline`.
 */
export function headlineOffer(rows: readonly OfferModel[] | null | undefined): OfferModel | null {
  const offers = rows ?? [];
  if (offers.length === 0) return null;

  const seen = new Set<string>();
  const unique = offers.filter((offer) => {
    if (seen.has(offer.discount_id)) return false;
    seen.add(offer.discount_id);
    return true;
  });

  return unique.reduce((best, offer) => {
    const rank = (entry: OfferModel) => (entry.type === 'percentage' ? 1 : 0);
    if (rank(offer) !== rank(best)) return rank(offer) > rank(best) ? offer : best;
    return Number(offer.value) > Number(best.value) ? offer : best;
  });
}

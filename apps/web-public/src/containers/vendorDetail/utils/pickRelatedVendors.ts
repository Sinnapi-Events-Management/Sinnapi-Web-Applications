import type { VendorCardModel } from '@/lib/types';

/** A pool/current item that may carry a category (mock rows) for similarity. */
type Candidate = VendorCardModel & { category?: string };

/**
 * Picks a few vendors to show in the "more like this" rail. Prefers the same
 * category (when the rows carry one — i.e. mock data) and backfills with other
 * vendors so the rail stays full. Pure + deterministic; excludes the current
 * vendor by id.
 */
export function pickRelatedVendors(
  pool: Candidate[],
  current: Candidate,
  limit = 4,
): VendorCardModel[] {
  const others = pool.filter((vendor) => vendor.id !== current.id);
  const similar = current.category
    ? others.filter((vendor) => vendor.category === current.category)
    : [];
  const similarIds = new Set(similar.map((vendor) => vendor.id));
  const backfill = others.filter((vendor) => !similarIds.has(vendor.id));
  return [...similar, ...backfill].slice(0, limit);
}

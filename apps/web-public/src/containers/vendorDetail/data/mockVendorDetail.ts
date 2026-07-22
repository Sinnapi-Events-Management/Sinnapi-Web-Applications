import type { VendorDetailModel, VendorMediaModel, PublicReview } from '@/lib/types';
import { MOCK_VENDORS } from '@/containers/vendors/data/mockVendors';
import type { MockVendor } from '@/containers/vendors/data/mockVendors';

/**
 * Mock fallback for the vendor detail page. While the `vendors` table is empty
 * (development), any card opened from the listing resolves here instead of
 * 404-ing — mirroring how the events detail page falls back to MOCK_EVENTS. The
 * single source of vendors is `MOCK_VENDORS` (shared with the listing); this
 * module augments a card into a full `VendorDetailModel` and synthesises a
 * gallery + reviews so the page is always populated. Switching to live data
 * needs no UI change.
 */

/** Pricing model per category — keeps the synthesized detail plausible. */
const PRICING_BY_CATEGORY: Record<string, VendorDetailModel['pricing_model']> = {
  photographer: 'fixed',
  videographer: 'fixed',
  decorator: 'custom',
  caterer: 'combination',
  makeup_artist: 'fixed',
  mc: 'hourly',
  dj: 'fixed',
  venue: 'custom',
  florist: 'combination',
  security: 'hourly',
  entertainment: 'fixed',
  equipment: 'combination',
};

/** Lead time per category. */
const LEAD_BY_CATEGORY: Record<string, VendorDetailModel['lead_time']> = {
  photographer: '1_2_weeks',
  videographer: '2_4_weeks',
  decorator: '2_4_weeks',
  caterer: '1_2_weeks',
  makeup_artist: 'same_week',
  mc: 'same_week',
  dj: '1_2_weeks',
  venue: '1_3_months',
  florist: '1_2_weeks',
  security: 'same_week',
  entertainment: '2_4_weeks',
  equipment: '1_2_weeks',
};

/** Experience band, rotated deterministically so the set looks varied. */
const YEARS_CYCLE: VendorDetailModel['years_in_operation'][] = [
  '10y_plus',
  '5_10y',
  '3_5y',
  '1_3y',
];

/** Local marketing photos reused to build a plausible portfolio gallery. */
const GALLERY_POOL = [
  '/images/deco-1.webp',
  '/images/deco-2.webp',
  '/images/image-2.webp',
  '/images/image7.webp',
  '/images/image9.webp',
  '/images/image12.webp',
  '/images/image15.webp',
  '/images/image18.webp',
  '/images/image23.webp',
  '/images/image29.webp',
];

/** A small pool of review copy, paired deterministically by index. */
const REVIEW_SEEDS: { title: string; body: string; offset: number }[] = [
  {
    title: 'Exceeded our expectations',
    body: 'Professional from the first call to the final delivery. Punctual, organised and genuinely lovely to work with — we’d book again without hesitation.',
    offset: 0,
  },
  {
    title: 'Made our day stress-free',
    body: 'Communication was clear throughout and everything ran exactly to plan. Our guests are still talking about it weeks later.',
    offset: -0.2,
  },
  {
    title: 'Great value and quality',
    body: 'Fair pricing for the quality delivered. They listened to what we wanted and brought their own creative ideas too.',
    offset: -0.4,
  },
];

const clampRating = (value: number): number => Math.max(1, Math.min(5, Math.round(value * 2) / 2));

/** Strips the listing-only fields and augments a card into a full detail model. */
function toVendorDetail(vendor: MockVendor, index: number): VendorDetailModel {
  const category = vendor.category ?? '';
  return {
    ...vendor,
    website: null,
    pricing_model: PRICING_BY_CATEGORY[category] ?? 'custom',
    lead_time: LEAD_BY_CATEGORY[category] ?? '2_4_weeks',
    years_in_operation: YEARS_CYCLE[index % YEARS_CYCLE.length],
  };
}

/** Resolves a mock vendor detail by slug, or null when the slug is unknown. */
export function findMockVendorDetail(slug: string): VendorDetailModel | null {
  const index = MOCK_VENDORS.findIndex((vendor) => vendor.slug === slug);
  if (index === -1) return null;
  return toVendorDetail(MOCK_VENDORS[index], index);
}

/** A deterministic gallery for a mock vendor — 5 photos offset by its position. */
export function mockVendorMedia(vendor: VendorDetailModel): VendorMediaModel[] {
  const start = Math.max(
    0,
    MOCK_VENDORS.findIndex((v) => v.slug === vendor.slug),
  );
  return Array.from({ length: 5 }, (_, i) => {
    const url = GALLERY_POOL[(start + i) % GALLERY_POOL.length];
    return {
      id: `${vendor.id}-media-${i}`,
      media_type: 'image',
      url,
      caption: `${vendor.business_name} — work sample ${i + 1}`,
    };
  });
}

/** A deterministic set of reviews for a mock vendor, sized to its rating. */
export function mockVendorReviews(vendor: VendorDetailModel): PublicReview[] {
  const count = vendor.review_count > 0 ? Math.min(3, REVIEW_SEEDS.length) : 0;
  const dates = ['2026-05-18', '2026-04-02', '2026-02-21'];
  return REVIEW_SEEDS.slice(0, count).map((seed, i) => ({
    id: `${vendor.id}-review-${i}`,
    rating: clampRating(vendor.avg_rating + seed.offset),
    title: seed.title,
    body: seed.body,
    created_at: dates[i] ?? dates[0],
  }));
}

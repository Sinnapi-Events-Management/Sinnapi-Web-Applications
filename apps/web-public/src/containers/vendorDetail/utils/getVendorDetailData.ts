import { notFound } from 'next/navigation';
import {
  getVendorBySlug,
  getVendorMedia,
  getVendorReviews,
  getVendors,
  getAllVendorSlugs,
  getVendorPackages,
} from '@/lib/queries';
import { MOCK_VENDORS } from '@/containers/vendors/data/mockVendors';
import { findMockVendorDetail, mockVendorMedia, mockVendorReviews } from '../data/mockVendorDetail';
import { pickRelatedVendors } from './pickRelatedVendors';

/** Single vendor for SEO/metadata — live first, then mock fallback. */
export async function getVendorBySlugData(slug: string) {
  return (await getVendorBySlug(slug)) ?? findMockVendorDetail(slug);
}

/** Slugs for static generation — live first, then the mock slugs in development. */
export async function getAllVendorSlugsData() {
  const live = await getAllVendorSlugs();
  return live.length > 0 ? live : MOCK_VENDORS.map((vendor) => vendor.slug);
}

/**
 * Resolves a single vendor plus its media, reviews and a few related vendors for
 * the detail page. Tries the live table first; while it's empty (development) it
 * falls back to the same mock dataset the listing uses, so any card opens a
 * populated page and the switch to real data needs no change here. Related
 * vendors are drawn from the same source the vendor came from to keep the rail
 * coherent.
 */
export async function getVendorDetailData(slug: string) {
  const liveVendor = await getVendorBySlug(slug);
  if (liveVendor) {
    const [media, reviews, pool, packages] = await Promise.all([
      getVendorMedia(liveVendor.id),
      getVendorReviews(liveVendor.id),
      getVendors(),
      getVendorPackages(liveVendor.id),
    ]);
    return {
      vendor: liveVendor,
      media,
      reviews,
      packages,
      related: pickRelatedVendors(pool, liveVendor),
    };
  }

  const mockVendor = findMockVendorDetail(slug);
  if (!mockVendor) notFound();

  // No mock packages, deliberately. A price is the one thing on this page that
  // must never be invented — a synthesised gallery is obviously filler, a
  // synthesised "UGX 1,350,000" is not.
  return {
    vendor: mockVendor,
    media: mockVendorMedia(mockVendor),
    reviews: mockVendorReviews(mockVendor),
    packages: [],
    related: pickRelatedVendors(MOCK_VENDORS, mockVendor),
  };
}

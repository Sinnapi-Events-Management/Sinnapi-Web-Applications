import { notFound } from 'next/navigation';
import {
  getVendorBySlug,
  getVendorMedia,
  getVendorReviews,
  getAllVendorSlugs,
} from '@/lib/queries';

export async function getVendorBySlugData(slug: string) {
  return getVendorBySlug(slug);
}

export async function getAllVendorSlugsData() {
  return getAllVendorSlugs();
}

export async function getVendorDetailData(slug: string) {
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const [media, reviews] = await Promise.all([
    getVendorMedia(vendor.id),
    getVendorReviews(vendor.id),
  ]);

  return { vendor, media, reviews };
}

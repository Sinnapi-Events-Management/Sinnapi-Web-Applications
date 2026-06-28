import { getVendors } from '@/lib/queries';

export async function getVendorsByCategoryData(category: string) {
  return getVendors({ category });
}

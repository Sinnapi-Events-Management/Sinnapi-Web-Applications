import { searchPublicVendors } from '@/lib/queries';

/**
 * Vendors for a category landing page.
 *
 * Goes through `search_vendors_public` because category lives in join tables:
 * the previous `getVendors({ category })` had nowhere to apply it and quietly
 * returned the unfiltered marketplace, so /vendors/category/caterer listed
 * photographers. The RPC also matches vendors that merely *sell* a service in
 * this category, not only those whose primary category is it.
 */
export async function getVendorsByCategoryData(category: string) {
  const { vendors } = await searchPublicVendors({ category });
  return vendors;
}

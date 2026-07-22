import { searchPublicVendors } from '@/lib/queries';

/**
 * Vendors for a region landing page.
 *
 * Same fix as the category landing page: service regions live in
 * `vendor_service_regions`, which `getVendors({ region })` never joined — it
 * accepted the filter and ignored it, listing every vendor on every region page.
 */
export async function getVendorsByRegionData(region: string) {
  const { vendors } = await searchPublicVendors({ region });
  return vendors;
}

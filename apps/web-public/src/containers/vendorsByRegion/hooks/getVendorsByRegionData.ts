import { getVendors } from '@/lib/queries';

export async function getVendorsByRegionData(region: string) {
  return getVendors({ region });
}

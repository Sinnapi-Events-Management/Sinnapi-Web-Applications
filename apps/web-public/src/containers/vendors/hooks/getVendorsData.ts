import { getVendors } from '@/lib/queries';

type SearchParams = { q?: string; category?: string; region?: string };

export async function getVendorsData(searchParams: SearchParams) {
  return getVendors({
    q: searchParams.q,
    category: searchParams.category,
    region: searchParams.region,
  });
}

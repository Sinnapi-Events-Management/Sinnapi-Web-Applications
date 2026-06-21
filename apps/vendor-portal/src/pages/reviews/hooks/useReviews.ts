import { useVendorReviews } from '@/hooks/queries';

export function useReviews(vendorId: string) {
  const { data, isLoading, error } = useVendorReviews(vendorId);
  const rows = data ?? [];

  return { rows, isLoading, error };
}

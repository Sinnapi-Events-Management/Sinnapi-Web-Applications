import { useVendorPayouts } from '@/hooks/queries';

export function usePayouts(vendorId: string) {
  const { data, isLoading, error } = useVendorPayouts(vendorId);
  const rows = data ?? [];

  return { rows, isLoading, error };
}

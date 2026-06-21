import { useVendorEscrow } from '@/hooks/queries';

export function useEscrow(vendorId: string) {
  const { data, isLoading, error } = useVendorEscrow(vendorId);
  const rows = data ?? [];

  return { rows, isLoading, error };
}

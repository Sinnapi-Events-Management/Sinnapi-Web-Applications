import { usePaymentsAdmin } from '@/hooks/queries';

export function usePayments() {
  const { data, isLoading, error } = usePaymentsAdmin();
  const rows = data ?? [];

  return { rows, isLoading, error };
}

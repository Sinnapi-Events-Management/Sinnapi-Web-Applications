import { usePayments as usePaymentsQuery } from '@/hooks/queries';

export function usePayments() {
  const { data, isLoading, error } = usePaymentsQuery();
  const rows = data ?? [];

  return { rows, isLoading, error };
}

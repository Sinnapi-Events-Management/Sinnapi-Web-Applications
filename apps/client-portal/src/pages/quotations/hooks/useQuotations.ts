import { useQuotations as useQuotationsQuery } from '@/hooks/queries';

export function useQuotations() {
  const { data, isLoading, error } = useQuotationsQuery();
  const rows = data ?? [];

  return { rows, isLoading, error };
}

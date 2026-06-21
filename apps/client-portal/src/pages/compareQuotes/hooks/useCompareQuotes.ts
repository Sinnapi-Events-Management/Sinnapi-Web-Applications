import { useQuotations } from '@/hooks/queries';

export function useCompareQuotes() {
  const { data, isLoading, error } = useQuotations();
  const rows = (data ?? []).filter((q) => ['sent', 'accepted', 'revised'].includes(q.status));

  return { rows, isLoading, error };
}

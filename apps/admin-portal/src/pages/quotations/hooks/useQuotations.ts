import { useQuotationsAdmin } from '@/hooks/queries';

export function useQuotations() {
  const { data, isLoading, error } = useQuotationsAdmin();
  const rows = data ?? [];

  return {
    isLoading,
    error,
    rows,
  };
}

import { useRetention as useRetentionQuery } from '@/hooks/queries';

export function useRetention() {
  const { data, isLoading, error } = useRetentionQuery();
  const rows = data ?? [];

  return {
    isLoading,
    error,
    rows,
  };
}

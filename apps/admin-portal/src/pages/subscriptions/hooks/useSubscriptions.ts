import { useSubscriptionsAdmin } from '@/hooks/queries';

export function useSubscriptions() {
  const { data, isLoading, error } = useSubscriptionsAdmin();
  const rows = data ?? [];

  return {
    rows,
    isLoading,
    error,
  };
}

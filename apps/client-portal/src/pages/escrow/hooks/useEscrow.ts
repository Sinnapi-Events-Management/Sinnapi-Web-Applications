import { useEscrow as useEscrowQuery } from '@/hooks/queries';

export function useEscrow() {
  const { data, isLoading, error } = useEscrowQuery();
  const rows = data ?? [];

  return { rows, isLoading, error };
}

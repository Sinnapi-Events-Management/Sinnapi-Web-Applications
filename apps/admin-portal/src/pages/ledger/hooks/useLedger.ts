import { useLedger as useLedgerQuery } from '@/hooks/queries';

export function useLedger() {
  const { data, isLoading, error } = useLedgerQuery();
  const rows = data ?? [];

  return {
    rows,
    isLoading,
    error,
  };
}

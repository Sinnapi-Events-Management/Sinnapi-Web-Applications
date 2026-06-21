import { useAuditLogs } from '@/hooks/queries';

export function useAudit() {
  const { data, isLoading, error } = useAuditLogs();
  const rows = data ?? [];

  return { rows, isLoading, error };
}

import { useAdminDashboard } from '@/hooks/queries';

export function useReports() {
  const { data, isLoading, error } = useAdminDashboard();

  return {
    data,
    isLoading,
    error,
  };
}

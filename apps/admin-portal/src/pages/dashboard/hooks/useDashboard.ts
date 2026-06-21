import { useAdminDashboard } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';

export function useDashboard() {
  const { roles } = useAdmin();
  const { data, isLoading, error } = useAdminDashboard();

  return { roles, data, isLoading, error };
}

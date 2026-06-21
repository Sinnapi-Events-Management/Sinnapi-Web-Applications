import { useNavigate } from 'react-router-dom';
import { useApplications as useApplicationsQuery } from '@/hooks/queries';

export function useApplications() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useApplicationsQuery();
  const rows = data ?? [];

  return { navigate, rows, isLoading, error };
}

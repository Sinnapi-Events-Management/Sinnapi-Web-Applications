import { useNavigate } from 'react-router-dom';
import { useVendorQuotations } from '@/hooks/queries';

export function useQuotations(vendorId: string) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useVendorQuotations(vendorId);
  const rows = data ?? [];

  return { navigate, rows, isLoading, error };
}

import { useNavigate } from 'react-router-dom';
import { useVendorBookings } from '@/hooks/queries';

export function useBookings(vendorId: string) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useVendorBookings(vendorId);
  const rows = data ?? [];

  return { navigate, rows, isLoading, error };
}

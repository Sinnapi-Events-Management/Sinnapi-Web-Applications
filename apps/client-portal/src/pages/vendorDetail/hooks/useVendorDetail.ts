import { useParams } from 'react-router-dom';
import { useVendor } from '@/hooks/queries';

export function useVendorDetail() {
  const { slug = '' } = useParams();
  const { data: vendor, isLoading, error } = useVendor(slug);

  return { vendor, isLoading, error };
}

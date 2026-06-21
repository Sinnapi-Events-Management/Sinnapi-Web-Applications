import { useParams } from 'react-router-dom';
import { useQuotation } from '@/hooks/queries';

export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuotation(id);

  return { quotation: data, isLoading, error };
}

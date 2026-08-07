import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useQuotation } from '@/hooks/queries';

export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuotation(id);

  useBreadcrumbTitle(data?.reference_no ? `Quotation ${data.reference_no}` : undefined);

  return { quotation: data, isLoading, error };
}

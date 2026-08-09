import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useQuotation } from '@/hooks/queries';

/**
 * Statuses where the vendor can still change the quote. Anything past these has
 * been sent to the client, so the page shows the breakdown instead of the
 * builder — editing a quote the client is already looking at would move the
 * numbers under them.
 */
const EDITABLE_STATUSES = ['requested', 'draft', 'revised'];

export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuotation(id);

  useBreadcrumbTitle(data?.reference_no ? `Quotation ${data.reference_no}` : undefined);

  return {
    quotation: data,
    isLoading,
    error,
    isEditable: Boolean(data && EDITABLE_STATUSES.includes(data.status)),
  };
}

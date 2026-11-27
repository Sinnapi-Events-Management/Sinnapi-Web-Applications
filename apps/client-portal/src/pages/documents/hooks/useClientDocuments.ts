import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMediaQuery, useTableState, useTheme } from '@sinnapi/ui';
import { kampalaToday } from '@sinnapi/ui/documents';
import { useClientInvoices, useClientReceipts } from '@/hooks/documentQueries';

export type ClientDocumentsTab = 'invoices' | 'receipts';

/**
 * The client's Invoices & Receipts page: which tab (kept in the URL so a
 * notification or a back-navigation lands on the right one), and a page of
 * each list. Both queries run only for the open tab.
 */
export function useClientDocuments() {
  const navigate = useNavigate();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [params, setParams] = useSearchParams();
  const tab: ClientDocumentsTab = params.get('tab') === 'receipts' ? 'receipts' : 'invoices';

  const invoiceTable = useTableState({ sort: { field: 'issue_date', direction: 'desc' } });
  const receiptTable = useTableState({ sort: { field: 'payment_date', direction: 'desc' } });
  const invoices = useClientInvoices(invoiceTable.params);
  const receipts = useClientReceipts(receiptTable.params);
  const today = useMemo(() => kampalaToday(), []);

  return {
    tab,
    setTab: (next: ClientDocumentsTab) =>
      setParams(next === 'receipts' ? { tab: 'receipts' } : {}, { replace: true }),
    compact,
    today,
    invoiceTable,
    receiptTable,
    invoices,
    receipts,
    openInvoice: (id: string) => navigate(`/invoices/${id}`),
    openReceipt: (id: string) => navigate(`/receipts/${id}`),
  };
}

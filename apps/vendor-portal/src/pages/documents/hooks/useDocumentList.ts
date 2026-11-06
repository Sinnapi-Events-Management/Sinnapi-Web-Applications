import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery, useTableState, useTheme } from '@sinnapi/ui';
import { kampalaToday, type InvoiceFilter } from '@sinnapi/ui/documents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVendorInvoices, useVendorReceipts } from '@/hooks/documentQueries';

/** Search, filter and paging shared by the invoice and receipt lists. */
function useListControls(defaultSort: { field: string; direction: 'asc' | 'desc' }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const table = useTableState({ sort: defaultSort, pageSize: 25 });
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const { onPageChange } = table.controls;

  // A new search starts from the first page; staying on page 4 of the old
  // result set would show an empty list that looks like "no matches".
  useEffect(() => {
    onPageChange(0);
  }, [debounced, onPageChange]);

  return { compact, table, search, setSearch, debounced };
}

export function useInvoiceList(vendorId: string) {
  const navigate = useNavigate();
  const [filter, setFilterState] = useState<InvoiceFilter>('all');
  const c = useListControls({ field: 'created_at', direction: 'desc' });
  const query = useVendorInvoices(vendorId, c.table.params, filter, c.debounced);
  const today = useMemo(() => kampalaToday(), []);

  return {
    ...c,
    today,
    filter,
    setFilter: (next: InvoiceFilter) => {
      setFilterState(next);
      c.table.controls.onPageChange(0);
    },
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    open: (id: string, status: string) =>
      navigate(status === 'draft' ? `/invoices/${id}/edit` : `/invoices/${id}`),
  };
}

export function useReceiptList(vendorId: string) {
  const navigate = useNavigate();
  const c = useListControls({ field: 'payment_date', direction: 'desc' });
  const query = useVendorReceipts(vendorId, c.table.params, c.debounced);

  return {
    ...c,
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    open: (id: string) => navigate(`/receipts/${id}`),
  };
}

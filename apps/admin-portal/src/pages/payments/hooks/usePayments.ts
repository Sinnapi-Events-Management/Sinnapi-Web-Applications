import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import {
  usePaymentsAdmin,
  usePaymentAdminStatusCounts,
  type PaymentAdminFilters,
  type PaymentAdminParams,
} from '@/hooks/queries';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { PAYMENT_STATUSES } from '@/lib/status';
import type { PaymentAdminModel } from '@/lib/types';
import { usePaymentFilters } from './usePaymentFilters';
import { getStatusTabs, getEmptyMessage, type PaymentTabValue } from '../schema';

/**
 * The Payments register: server-side search (booking reference, payer name or
 * email, provider reference, payment id) + provider/purpose/date filters +
 * status tab + sort + pagination, plus per-status count badges.
 *
 * A read-only surface — the row's only action is to open the payment — so this
 * hook only composes the smaller hooks and shapes the query params, each
 * concern owning its own URL-mirrored state elsewhere.
 */
export function usePayments() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // Any change to the query (tab, search, filter) re-queries from page 1 — a
  // later page rarely exists once the result set shrinks.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: PAYMENT_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });
  const filters = usePaymentFilters({ onChange: resetPage });

  // Non-status filters, shared by the list query and the count badges.
  const listFilters = useMemo<PaymentAdminFilters>(
    () => ({ search: search.query, ...filters.query }),
    [search.query, filters.query],
  );

  const params = useMemo<PaymentAdminParams>(
    () => ({
      ...table.params,
      ...listFilters,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, listFilters, status.value],
  );

  const { data, isLoading, isFetching, error } = usePaymentsAdmin(params);
  const { data: counts, isLoading: countsLoading } = usePaymentAdminStatusCounts(listFilters);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

  const filtered = Boolean(search.query) || filters.isActive || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as PaymentTabValue, filtered);

  const openPayment = useCallback(
    (payment: PaymentAdminModel) => navigate(`/payments/${payment.id}`),
    [navigate],
  );

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    countsLoading,
    tab: status.value as PaymentTabValue,
    onTabChange: status.setValue,
    search,
    filters,
    openPayment,
    table,
  };
}

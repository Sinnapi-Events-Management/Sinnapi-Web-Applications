import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import {
  useAdminOffers as useAdminOffersQuery,
  useAdminOfferCounts,
  type AdminOfferParams,
  type OfferStatusFilter,
} from '@/hooks/queries';
import { useOfferModerationFlow } from '@/components/offers/hooks/useOfferModerationFlow';
import { offerEmptyMessage, offerTabs } from '@/components/offers/schema/offerTabs';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import type { AdminOfferModel } from '@/lib/types';

/**
 * The offers console: the page, the tabs, the search and the paging.
 *
 * Listing only. The three writes an operator can perform on an offer live in
 * `useOfferModerationFlow`, because the vendor detail page performs exactly the
 * same three on exactly the same rows and the rules around them — the mandatory
 * reason, the campaign taking its codes with it, featuring existing only for a
 * campaign — must not be able to drift between the two screens.
 *
 * A thin coordinator: search, table state, the query and the moderation flow
 * each own their state elsewhere.
 */
export function useAdminOffers() {
  const navigate = useNavigate();
  const table = useTableState();
  const { onPageChange } = table.controls;

  // Any change to the query returns to page one: a later page rarely survives
  // the result set shrinking, which would strand the operator on an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  // `live` rather than `all`. Everything on that tab is being shown to clients
  // right now, which is the only set an operator opening this page can still
  // do something about.
  const [tab, setTabRaw] = useState<OfferStatusFilter>('live');
  const setTab = useCallback(
    (next: OfferStatusFilter) => {
      setTabRaw(next);
      resetPage();
    },
    [resetPage],
  );

  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo<AdminOfferParams>(
    () => ({ ...table.params, search: search.query, status: tab }),
    [table.params, search.query, tab],
  );

  const { data, isLoading, isFetching, error } = useAdminOffersQuery(params);
  const { data: counts, isLoading: countsLoading } = useAdminOfferCounts();
  const moderation = useOfferModerationFlow();

  const openVendor = useCallback(
    (offer: AdminOfferModel) => {
      if (offer.vendor_id) navigate(`/vendors/${offer.vendor_id}`);
    },
    [navigate],
  );

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    emptyMessage: offerEmptyMessage(tab, Boolean(search.query)),
    tabs: offerTabs(counts),
    tab,
    setTab,
    countsLoading,
    search,
    table,
    openVendor,
    ...moderation,
  };
}

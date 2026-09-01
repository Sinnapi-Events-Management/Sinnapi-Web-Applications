import { useCallback, useMemo, useState } from 'react';
import { useAdminOffers, type AdminOfferParams, type OfferStatusFilter } from '@/hooks/queries';
import { useOfferModerationFlow } from '@/components/offers/hooks/useOfferModerationFlow';
import { offerEmptyMessage, offerTabs } from '@/components/offers/schema/offerTabs';

/**
 * Cards per page. Generous because this list is one vendor's, not the
 * platform's: most vendors run a handful of campaigns in a season, so paging is
 * the exception here rather than the rule, and a page break in the middle of
 * six cards is a control an operator has to use for no reason.
 */
const PAGE_SIZE = 12;

/**
 * One vendor's offers, and the console's reach over them.
 *
 * WHY THE TAB DEFAULTS TO `all` AND THE CONSOLE'S DEFAULTS TO `live`
 * They are answering different questions. The console is a queue — everything
 * on `live` is being shown to clients right now and is the only set still worth
 * a decision. This tab is a dossier: an operator lands here because of a
 * complaint about a vendor, and the withdrawn campaign from last month is often
 * the most relevant row on the page. Opening on `live` would hide exactly the
 * history they came for, and hide it behind a tab that says nothing is wrong.
 *
 * NO SEARCH
 * `admin_search_offers` takes one, but a vendor runs a handful of campaigns and
 * a search box over six cards is furniture. The status tabs are the only filter
 * that earns its space here.
 *
 * The counts are deliberately absent from the tabs. `admin_offer_counts` is
 * platform-wide, and a badge reading "Live 62" over one vendor's four cards is
 * worse than no badge — the same argument the console's own badges are built on,
 * pointed the other way.
 */
export function useVendorOffers(vendorId: string) {
  const [tab, setTabRaw] = useState<OfferStatusFilter>('all');
  const [page, setPage] = useState(0);

  // A tab change returns to page one: a later page rarely survives the result
  // set shrinking, which would strand the operator on an empty grid.
  const setTab = useCallback((next: OfferStatusFilter) => {
    setTabRaw(next);
    setPage(0);
  }, []);

  const params = useMemo<AdminOfferParams>(
    () => ({ page, pageSize: PAGE_SIZE, status: tab, vendorId }),
    [page, tab, vendorId],
  );

  const { data, isLoading, isFetching, error } = useAdminOffers(params);
  const moderation = useOfferModerationFlow();

  const total = data?.total ?? 0;

  return {
    offers: data?.rows ?? [],
    total,
    page,
    setPage,
    pageCount: Math.ceil(total / PAGE_SIZE),
    isLoading,
    // Distinct from `isLoading`: a tab switch keeps the previous cards on screen
    // (`placeholderData` on the query) and dims them, so switching reads as
    // filtering rather than as the tab reloading from nothing.
    isRefreshing: isFetching && !isLoading,
    error,
    tab,
    setTab,
    tabs: offerTabs(undefined),
    emptyMessage: offerEmptyMessage(tab, false, 'vendor'),
    ...moderation,
  };
}

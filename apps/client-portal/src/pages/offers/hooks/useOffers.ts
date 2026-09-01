import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOfferDirectory, useServiceCategoryOptions } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * How long a typed search waits before it reaches the server.
 *
 * The same window Discover uses, for the same reason: it coalesces a burst of
 * keystrokes into one query without making a single deliberate change feel
 * delayed.
 */
const SEARCH_DEBOUNCE_MS = 300;

const PAGE_SIZE = 12;

/**
 * The offers directory: what is on offer across the platform, filtered.
 *
 * THE FILTERS LIVE IN THE URL
 * The same choice Discover made, and it matters more here: an offer is
 * time-limited, so "photographers with a sale on" is exactly the kind of page a
 * client sends to whoever they are planning with. A filter held in component
 * state produces a link that opens on an unfiltered page.
 *
 * PAGING IS A PAGE NUMBER, NOT AN INFINITE SCROLL
 * Discover scrolls because a vendor list is browsed. This is scanned against a
 * deadline — a client wants to see everything on offer, decide, and act — and a
 * numbered page is what lets them get back to the one they were looking at
 * after opening a vendor in between.
 *
 * The page resets whenever a filter changes. Without that, narrowing from 60
 * results to 4 while sitting on page 3 lands the client on an empty page they
 * did not ask for and cannot explain.
 */
export function useOffers() {
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const categoryId = params.get('category');
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);

  // Debounced for the request only. The input reflects the URL immediately, so
  // nothing about typing feels delayed.
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const categories = useServiceCategoryOptions();

  const query = useOfferDirectory({
    search: debouncedSearch,
    categoryId,
    regionId: null,
    page,
    pageSize: PAGE_SIZE,
  });

  /**
   * One writer for the URL, so a filter change can reset the page in the same
   * navigation rather than in a second one — two `setParams` calls would put an
   * intermediate state in the history and make Back land on a page nobody saw.
   */
  const update = useCallback(
    (next: { q?: string; category?: string | null; page?: number }) => {
      setParams(
        (current) => {
          const draft = new URLSearchParams(current);

          if (next.q !== undefined) {
            if (next.q) draft.set('q', next.q);
            else draft.delete('q');
          }
          if (next.category !== undefined) {
            if (next.category) draft.set('category', next.category);
            else draft.delete('category');
          }

          // Any filter change returns to the first page; an explicit page wins.
          const resetsPage = next.q !== undefined || next.category !== undefined;
          const target = next.page ?? (resetsPage ? 0 : page);
          if (target > 0) draft.set('page', String(target));
          else draft.delete('page');

          return draft;
        },
        { replace: true },
      );
    },
    [setParams, page],
  );

  const [pendingScroll, setPendingScroll] = useState(false);

  const goToPage = useCallback(
    (next: number) => {
      update({ page: next });
      setPendingScroll(true);
    },
    [update],
  );

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((row) => ({ value: row.id, label: row.name })),
    [categories.data],
  );

  return {
    search,
    setSearch: (value: string) => update({ q: value }),
    categoryId,
    setCategory: (value: string | null) => update({ category: value }),
    categoryOptions,
    offers: query.data?.rows ?? [],
    total,
    page,
    pageCount,
    goToPage,
    pendingScroll,
    clearPendingScroll: () => setPendingScroll(false),
    isLoading: query.isLoading,
    // `isFetching` while data is already on screen: the grid stays up and dims
    // rather than collapsing to a spinner, which is what makes paging feel like
    // paging rather than like a fresh page load.
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    isFiltered: Boolean(search || categoryId),
    clearFilters: () => update({ q: '', category: null }),
  };
}

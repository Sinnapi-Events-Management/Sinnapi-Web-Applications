import { useCallback, useMemo } from 'react';
import type { ListFilterState } from '@sinnapi/ui';
import { useVendorQuotationFacets } from '@/hooks/queries';
import { QUOTE_QUICK_TABS, QUOTE_TAB_STATUS, type QuoteQuickTab } from '../schema/quickTabs';

/**
 * One-tap views over the quotations list — presets on the status filter, so
 * search, the Filters panel and shared links keep working. Counts come from
 * an unfiltered facet read so the badges do not move as views change.
 */
export function useQuotationQuickTabs(vendorId: string, list: ListFilterState<'status'>) {
  const { data: allCounts } = useVendorQuotationFacets(vendorId, {});
  const { status } = list.values;
  const { from, to } = list.dateRange;

  const active = useMemo<QuoteQuickTab | null>(() => {
    if (from || to) return null;
    const hit = QUOTE_QUICK_TABS.find((t) => QUOTE_TAB_STATUS[t.value] === (status ?? ''));
    return hit?.value ?? null;
  }, [status, from, to]);

  const select = useCallback(
    (tab: QuoteQuickTab) =>
      list.applyFilters(QUOTE_TAB_STATUS[tab] ? { facets: { status: QUOTE_TAB_STATUS[tab] } } : {}),
    [list],
  );

  return {
    tabs: QUOTE_QUICK_TABS,
    active,
    select,
    counts: {
      price: allCounts?.status?.requested ?? 0,
      changes: allCounts?.status?.revised ?? 0,
    },
  };
}

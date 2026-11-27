import { useCallback, useMemo } from 'react';
import {
  localToday,
  type BookingFilterKey,
  type ListFilterState,
  type TableState,
} from '@sinnapi/ui';
import { useVendorBookingFacets } from '@/hooks/queries';
import { QUICK_TABS, type QuickTab } from '../schema/quickTabs';

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localToday(d);
}

/**
 * The four one-tap views above the bookings list. Each is just a preset over
 * the existing URL filters (status / date range) and a sort, so search, the
 * Filters panel and shared links keep working; a view is "active" only while
 * the filters still match it exactly.
 *
 * The "Needs your reply" count comes from an unfiltered facet read, so the
 * number does not jump around while the vendor flips between views.
 */
export function useBookingQuickTabs(
  vendorId: string,
  list: ListFilterState<BookingFilterKey>,
  table: TableState,
) {
  const { data: allCounts } = useVendorBookingFacets(vendorId, {});
  const today = localToday();

  const { status, payment_type, terms_status } = list.values;
  const { from, to } = list.dateRange;
  const extra = Boolean(payment_type || terms_status);

  const active: QuickTab | null = useMemo(() => {
    if (extra) return null;
    if (status === 'requested' && !from && !to) return 'reply';
    if (!status && from === today && !to) return 'upcoming';
    if (!status && !from && to && to < today) return 'past';
    if (!status && !from && !to) return 'all';
    return null;
  }, [extra, status, from, to, today]);

  const { onSortChange } = table.controls;
  const select = useCallback(
    (tab: QuickTab) => {
      list.applyFilters(
        tab === 'reply'
          ? { facets: { status: 'requested' } }
          : tab === 'upcoming'
            ? { dateRange: { from: today, to: '' } }
            : tab === 'past'
              ? { dateRange: { from: '', to: yesterday() } }
              : {},
      );
      // Soonest first where the vendor is planning ahead; newest first otherwise.
      onSortChange({
        field: 'event_date',
        direction: tab === 'upcoming' || tab === 'reply' ? 'asc' : 'desc',
      });
    },
    [list, onSortChange, today],
  );

  return {
    tabs: QUICK_TABS,
    active,
    select,
    needsReply: allCounts?.status?.requested ?? 0,
  };
}

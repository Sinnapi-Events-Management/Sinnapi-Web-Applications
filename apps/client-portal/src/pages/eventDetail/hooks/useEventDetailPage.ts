import { useMemo } from 'react';
import { useUrlTab } from '@sinnapi/ui/router';
import { useEventVendors } from '@/hooks/queries';
import { EVENT_TABS } from '../schema';
import { useEventDetail } from './useEventDetail';
import { useRequirements } from './useRequirements';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a message all land
 * on the section that was being read.
 *
 * The requirements and the vendor board are read here rather than only inside
 * their own sections, because the tab bar needs both counts before either
 * section has ever been opened — a badge that only appears once you visit the
 * tab it is meant to send you to is a badge that does nothing. Both sections
 * read the same queries, so this costs a cache hit each, not a second request.
 *
 * The requirement rows are passed on as well: the vendors section needs them to
 * offer the "trim a nice-to-have" nudge when a quote goes over budget, and the
 * invite dialog needs them for its line picker.
 */
export function useEventDetailPage() {
  const detail = useEventDetail();
  const { tab, setTab } = useUrlTab(EVENT_TABS);
  const requirements = useRequirements(detail.id);
  const vendors = useEventVendors(detail.id);

  // Quotes the vendor has sent and the client has not answered. The only number
  // on this page that is genuinely outstanding work for the person reading it.
  const awaitingCount = useMemo(
    () =>
      (vendors.data ?? []).filter(
        (v) =>
          ['sent', 'revised'].includes(v.quotation_status ?? '') &&
          v.interest_status !== 'declined' &&
          v.interest_status !== 'withdrawn',
      ).length,
    [vendors.data],
  );

  return {
    ...detail,
    tab,
    setTab,
    openCount: requirements.openCount,
    awaitingCount,
    requirements: requirements.rows,
  };
}

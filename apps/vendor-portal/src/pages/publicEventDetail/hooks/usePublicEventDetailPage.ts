import { useUrlTab } from '@sinnapi/ui/router';
import { useMyInterests, useVendorEventBookings } from '@/hooks/queries';
import { useVendorCategories } from '@/hooks/useVendorCategories';
import { isActionable } from '@/lib/events';
import { PUBLIC_EVENT_TABS } from '../schema';
import { usePublicEventDetail } from './usePublicEventDetail';
import { useEventPlan } from './useEventPlan';
import { useVendorEventQuotes } from './useVendorEventQuotes';

/**
 * Everything the event page renders, resolved in one place. Components below it
 * receive finished data and decide only how it looks.
 *
 * The open section lives in the URL so a reload, a back button or a link pasted
 * into a message all land on the section that was being read.
 *
 * The plan, the quotes and the bookings are read HERE rather than only inside
 * their own sections, because the tab bar needs their counts before any of the
 * three has been opened — a badge that only appears once you visit the tab it
 * is meant to send you to is a badge that does nothing. Each section reads the
 * same queries, so this costs a cache hit apiece, not a second request.
 *
 * Nothing here is blocked on anything else. The event alone drives `isLoading`,
 * so the hero paints as soon as there is an event to name and the sections fill
 * in behind it — holding the whole page for a plan the vendor may never open
 * would trade the first thing they read for the fourth.
 */
export function usePublicEventDetailPage(vendorId: string) {
  const detail = usePublicEventDetail();
  const { tab, setTab } = useUrlTab(PUBLIC_EVENT_TABS);

  // What this vendor is allowed to quote for, mirroring `vendor_serves_category`.
  // Read before the plan because the plan is grouped and counted by it.
  const categories = useVendorCategories();
  const plan = useEventPlan(detail.id, categories.serves);
  const quotes = useVendorEventQuotes(vendorId, detail.id);
  const bookings = useVendorEventBookings(vendorId, detail.id);

  const interests = useMyInterests(vendorId);
  const interested = (interests.data ?? []).some((row) => row.event_id === detail.id);

  return {
    ...detail,
    tab,
    setTab,
    plan,
    quotes,
    bookings: {
      rows: bookings.data ?? [],
      isLoading: bookings.isLoading,
      error: bookings.error,
    },
    /** Whether this vendor's interest is already on record for the event. */
    interested,
    /**
     * Whether the event can be acted on at all. Admin-posted briefs are
     * inspiration: `express_event_interest` refuses them, so every control that
     * would call it is withheld rather than shown and then rejected.
     */
    actionable: detail.event ? isActionable(detail.event) : false,
    categories,
    /**
     * Whether this vendor may take the event-wide action.
     *
     * The browser's reading of the same rule migration 0901l enforces: the
     * event must be actionable, and either have no plan at all or have at least
     * one open line in a category this vendor serves.
     *
     * It waits for the categories to load rather than assuming the worst.
     * An empty set and a set that has not arrived are indistinguishable, and
     * treating "not yet" as "not your work" would flash a refusal at every
     * vendor on every first paint.
     */
    canExpressInterest:
      (detail.event ? isActionable(detail.event) : false) &&
      (categories.isLoading || plan.isLoading || plan.hasAnythingForYou),
  };
}

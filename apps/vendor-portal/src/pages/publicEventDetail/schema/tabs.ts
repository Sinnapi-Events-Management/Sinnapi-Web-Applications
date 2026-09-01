/**
 * The event page's sections, mirrored into the URL
 * (`/public-events/:id?tab=plan`).
 *
 * Split by the question a vendor is asking, not by data source: "what is this
 * job" (overview), "what do they actually need" (plan), "where does my price
 * stand" (quote), "what did I win" (booking).
 *
 * Overview leads because it answers the question someone opening a brief
 * usually has, and it is the default — represented by the ABSENCE of the
 * parameter, so `/public-events/:id` stays canonical and adding a section later
 * can never re-point an existing link.
 *
 * All four always render, including Booking on an event the vendor has not won.
 * A tab that appears only once its content exists is a tab a vendor learns is
 * unreliable, and it moves the ones beside it under the reader's finger the
 * moment a booking lands. An empty section says so instead.
 */
export const PUBLIC_EVENT_TABS = ['overview', 'plan', 'quote', 'booking'] as const;

export type PublicEventTab = (typeof PUBLIC_EVENT_TABS)[number];

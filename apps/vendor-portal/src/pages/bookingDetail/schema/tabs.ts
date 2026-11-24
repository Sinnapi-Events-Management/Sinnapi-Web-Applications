/**
 * The booking page's four sections, mirrored into the URL
 * (`/bookings/:id?tab=money`).
 *
 * The split is by the question being asked, not by data source: "what is this
 * booking" (overview), "where is my money" (money), "how far along is it"
 * (progress), "what did it come from" (origin). Ten cards in one column meant a
 * vendor chasing a payout scrolled past the event, the quote and the whole
 * status trail to reach it.
 *
 * 2026-11-17: four tabs became three — Details, Money, History. "Origin" meant
 * nothing to vendors and wrapped the tab row onto two lines on a phone; its
 * event and quote cards now sit under Details. The keys are unchanged so old
 * links still land, and a stale `?tab=origin` falls back to Details, which is
 * where that content now lives.
 *
 * Overview leads because it answers the question someone opening a booking
 * usually has, and it is the default — represented by the *absence* of the
 * parameter, so `/bookings/:id` stays canonical and adding a section later can
 * never re-point an existing link.
 */
export const BOOKING_TABS = ['overview', 'money', 'progress'] as const;

export type BookingTab = (typeof BOOKING_TABS)[number];

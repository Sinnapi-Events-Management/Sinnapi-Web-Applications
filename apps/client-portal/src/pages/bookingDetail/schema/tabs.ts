/**
 * The booking page's four sections, mirrored into the URL
 * (`/bookings/:id?tab=money`).
 *
 * The split is by the question being asked, not by data source: "what is this
 * booking" (overview), "what do I owe and when" (money), "how far along is it"
 * (progress), "what did it come from" (origin). Nine cards in one column meant
 * a client checking whether their deposit had landed scrolled past the event,
 * the quote and the whole status trail to reach it.
 *
 * The vendor portal splits its own booking page the same four ways, on purpose:
 * the two sides of a booking talk to each other about it, and "it's under
 * Payment" should mean the same thing in both directions.
 *
 * Overview leads because it answers the question someone opening a booking
 * usually has, and it is the default — represented by the *absence* of the
 * parameter, so `/bookings/:id` stays canonical and adding a section later can
 * never re-point an existing link.
 */
export const BOOKING_TABS = ['overview', 'money', 'progress', 'origin'] as const;

export type BookingTab = (typeof BOOKING_TABS)[number];

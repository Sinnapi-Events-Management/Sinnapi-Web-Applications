/**
 * The console booking page's five sections, mirrored into the URL
 * (`/bookings/:id?tab=escrow`).
 *
 * The split is by the question an operator is answering, not by data source:
 * "what is this booking and who is it between" (overview), "where is the money"
 * (money), "what is Sinnapi holding and who is waiting on us" (escrow), "what
 * has happened to it" (activity), "what was agreed before it existed" (origin).
 * Nine cards in two columns meant an operator opening this page from a support
 * thread scrolled past the parties, the quote and the whole trail to reach the
 * settlement they were called about.
 *
 * Escrow is its own section rather than part of `money`, unlike the vendor's
 * and client's pages, which have four sections and fold it in. That difference
 * is deliberate: the console is the only side that *acts* on a settlement —
 * release, forward, refuse — so for an operator it is a workspace, while for
 * the other two it is a status they read. A tab is worth spending on the
 * surface someone works in.
 *
 * Overview leads because it answers the question someone opening a booking
 * usually has, and it is the default — represented by the *absence* of the
 * parameter, so `/bookings/:id` stays canonical and adding a section later can
 * never re-point an existing link.
 */
export const BOOKING_TABS = ['overview', 'money', 'escrow', 'activity', 'origin'] as const;

export type BookingTab = (typeof BOOKING_TABS)[number];

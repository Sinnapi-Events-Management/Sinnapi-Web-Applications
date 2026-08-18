/**
 * The step between an accepted quote and a booking, as data. Pure (no
 * React/MUI), shared by the client and vendor portals for the same reason
 * `quotationTransitions` is: both sides render the state of this step, and a
 * client who is told "you can book this" while the vendor is told "nothing has
 * happened yet" is two screens disagreeing about one row.
 *
 * The rules here mirror `create_booking_from_quotation`. The server is the
 * enforcement; this is the UI declining to offer a button the server would
 * refuse, and saying which of the two of them is standing in the way.
 */

import { rpcErrorMessage } from './rpcError';

/**
 * The only quotation status a booking can be made from.
 *
 * Not "any settled status" and not "anything with a total": a `sent` quote is
 * an offer nobody has answered, and booking against it would skip the accept
 * that binds the price and copies the advance terms onto the booking.
 */
export const BOOKABLE_QUOTATION_STATUS = 'accepted';

/** Whether this quotation is at the point where a booking can be made from it. */
export function isQuotationBookable(status: string | null | undefined): boolean {
  return status === BOOKABLE_QUOTATION_STATUS;
}

/**
 * Where an accepted quotation has got to on its way to a booking.
 *
 * `not-accepted` and `booked` are both "no button", but for opposite reasons —
 * one is too early and one is done — so they are separate states rather than a
 * boolean. The vendor's page renders all four; the client's renders the two it
 * can act on plus the one it cannot.
 */
export type QuotationBookingStage =
  /** The quote has not been accepted, so there is nothing to schedule yet. */
  | 'not-accepted'
  /** Accepted and unscheduled — the client picks a date. */
  | 'bookable'
  /** A booking exists and is still live. */
  | 'booked'
  /** A booking existed and was cancelled or declined; the quote can be re-booked. */
  | 'released';

/**
 * Booking statuses that no longer hold the quotation.
 *
 * A cancelled or declined booking is a dead row, and the partial unique index
 * behind `ux_bookings_quotation` still counts it — so this does not mean "book
 * it again", it means "the schedule fell through". Both portals say so rather
 * than showing a live booking link that leads to a cancelled one.
 */
const DEAD_BOOKING_STATUSES = ['cancelled', 'declined'];

export function quotationBookingStage(input: {
  quotationStatus: string | null | undefined;
  bookingStatus?: string | null;
}): QuotationBookingStage {
  const { quotationStatus, bookingStatus } = input;
  if (bookingStatus) {
    return DEAD_BOOKING_STATUSES.includes(bookingStatus) ? 'released' : 'booked';
  }
  return isQuotationBookable(quotationStatus) ? 'bookable' : 'not-accepted';
}

/** `create_booking_from_quotation` refusals, in plain language. */
const BOOKING_FROM_QUOTATION_ERRORS: Record<string, string> = {
  quotation_not_accepted:
    'This quote has not been accepted, so there is nothing to schedule yet. Accept it first.',
  quotation_not_priced:
    'This quote has no price on it, so a booking made from it would be worth nothing. Ask the ' +
    'vendor to send the priced quote before scheduling it.',
  booking_already_exists:
    'A booking has already been created from this quote. Open it to change the date or cancel it.',
  vendor_unavailable:
    'This vendor is not currently taking bookings. Message them, or contact support if you have ' +
    'already paid.',
  date_unavailable:
    'The vendor has marked that date as unavailable. Pick another one, or message them to ask.',
  event_date_in_past: 'Pick a date in the future.',
  invalid_time_window: 'The end time must be after the start time.',
  start_time_required: 'Add a start time as well, or leave both blank.',
  location_too_long: 'That location is too long — keep it under 160 characters.',
  not_found: 'This quotation no longer exists.',
  forbidden: 'You do not have permission to book this quotation.',
};

/**
 * A failed `create_booking_from_quotation` as a sentence the client can act on.
 * Reading the failure is delegated to `rpcErrorMessage` — a Supabase RPC error
 * is a plain object, not an `Error`, and an unmapped Postgres fault is a bug in
 * us rather than something to put in front of a client.
 */
export function bookingFromQuotationError(error: unknown): string {
  return rpcErrorMessage(error, BOOKING_FROM_QUOTATION_ERRORS);
}

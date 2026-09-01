import { z } from 'zod';
import { optionalTimeField, requiredDateField } from '@/lib/schema';

/**
 * Scheduling an accepted quote.
 *
 * Notice what is *not* here: no amount, no vendor, no currency. Those are
 * settled on the quotation and `create_booking_from_quotation` reads them off
 * it, so there is no field for them and no way for a form to disagree with the
 * price both parties agreed. What the client supplies is exactly what the
 * quotation never carried — when, and where.
 *
 * The rules mirror the RPC's guards so the client hears them before a round
 * trip, not after one.
 */
export const bookingFromQuotationSchema = z
  .object({
    event_date: requiredDateField('Event date'),
    start_time: optionalTimeField('start time'),
    end_time: optionalTimeField('end time'),
    location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
  })
  // An end with no start is not a window — there is nothing to count back from.
  // A start with no end is fine: "from 14:00" is a real arrangement.
  .refine((v) => !(v.end_time && !v.start_time), {
    message: 'Add a start time as well.',
    path: ['start_time'],
  })
  .refine((v) => !(v.start_time && v.end_time) || v.end_time > v.start_time, {
    message: 'The end time must be after the start time.',
    path: ['end_time'],
  });

export type BookingFromQuotationValues = z.infer<typeof bookingFromQuotationSchema>;

export const emptyBookingFromQuotationValues: BookingFromQuotationValues = {
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
};

/** The payment terms half of the call, from `usePaymentTermsChoice`. */
export type BookingTermsArgs = {
  p_payment_type: 'escrow' | 'direct';
  p_advance_rate: number | null;
};

/**
 * Arguments for `create_booking_from_quotation`.
 *
 * Times collapse to null rather than empty strings — Postgres `time` rejects
 * `''`, and null is what "not stated" has always looked like on this table. The
 * location does the same, so a booking with a blank box is indistinguishable
 * from one where the question was never answered.
 *
 * The terms arrive separately rather than as form fields. They are not typed
 * into anything — the rail is a choice between two priced cards and the advance
 * is a slider bounded by a server-supplied ceiling — so putting them through
 * zod would mean re-describing bounds the server already enforces and already
 * told us. What the schema validates is what the client can get wrong.
 */
export function toBookingFromQuotationArgs(
  values: BookingFromQuotationValues,
  quotationId: string,
  terms: BookingTermsArgs,
) {
  return {
    p_quotation_id: quotationId,
    p_event_date: values.event_date,
    p_start_time: values.start_time || null,
    p_end_time: values.end_time || null,
    p_location: values.location.trim() || null,
    ...terms,
  };
}

/**
 * The date to open the picker on.
 *
 * Two sources, in order of how much the client has already committed to them:
 * the date they gave when ORDERING a package — which the offer was validated
 * against and which the vendor approved — and then the planned event's own
 * date, which is a softer suggestion. Either way the common case is a client
 * confirming a date they already told us rather than re-entering it.
 *
 * Only when it is still in the future — a date that has passed is not a
 * default, it is a validation error waiting to happen.
 */
/**
 * The location to open the booking form on.
 *
 * The address the client gave when they requested the quote — the one the
 * vendor read before approving, and so the one the booking should default to.
 * Editable, not locked: nothing downstream depends on it the way the date
 * depends on the offer's window, and a client who has since moved the venue
 * must be able to say so here rather than in a message.
 *
 * Truncated to the booking's own cap rather than dropped if it somehow exceeds
 * it — a prefill that silently fails validation is worse than a blank box.
 */
export function defaultBookingLocation(eventAddress: string | null | undefined): string {
  return (eventAddress ?? '').slice(0, 160);
}

export function defaultBookingDate(
  quotationEventDate: string | null | undefined,
  eventDate: string | null | undefined,
  today: string,
): string {
  const candidate = quotationEventDate ?? eventDate;
  return candidate && candidate >= today ? candidate : '';
}

/**
 * The days the booking calendar will accept.
 *
 * A quote carrying an offer is bound to that offer's window — the trigger on
 * `bookings.event_date` refuses anything outside it, on insert AND on a later
 * reschedule. Bounding the picker is what turns that from an error message into
 * a calendar that simply does not offer the wrong days.
 *
 * `minDate` never precedes today even when the offer opened months ago: an
 * offer that has been running since August does not make August bookable.
 */
export function bookingDateBounds(
  offer: { starts_on?: string | null; ends_on?: string | null } | null | undefined,
  today: string,
): { minDate: string; maxDate?: string; isOfferBound: boolean } {
  const startsOn = offer?.starts_on ?? null;
  const endsOn = offer?.ends_on ?? null;
  if (!startsOn || !endsOn) return { minDate: today, isOfferBound: false };
  return {
    minDate: startsOn > today ? startsOn : today,
    maxDate: endsOn,
    isOfferBound: true,
  };
}

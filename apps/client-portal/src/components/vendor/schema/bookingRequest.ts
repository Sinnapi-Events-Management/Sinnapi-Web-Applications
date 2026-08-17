import { z } from 'zod';
import { optionalTimeField, requiredDateField } from '@/lib/schema';
import type { BookingTermsArgs } from '@/pages/quotationDetail/schema';

/**
 * What the client expects this to cost.
 *
 * Required, and required to be more than zero. Since payment terms are agreed
 * with the request, every figure the client is being asked to accept is a
 * percentage of this one — an escrow booking for an unstated amount would ask
 * them to consent to a service fee of nothing. "I do not know yet" is a real
 * answer, and it is what the Request a quote button on this same panel is for.
 */
const bookingAmountField = z
  .string()
  .trim()
  .min(1, 'Enter what you expect this to cost.')
  .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
  .refine((v) => Number(v) > 0, 'Enter an amount greater than zero.');

export const bookingRequestSchema = z
  .object({
    event_date: requiredDateField('Event date'),
    start_time: optionalTimeField('start time'),
    end_time: optionalTimeField('end time'),
    location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
    amount: bookingAmountField,
  })
  // An end with no start is not a window — the vendor would have nothing to
  // count back from. A start with no end is fine: "from 14:00" is a real ask.
  .refine((v) => !(v.end_time && !v.start_time), {
    message: 'Add a start time as well.',
    path: ['start_time'],
  })
  // Same rule the RPC enforces, said here so the client hears it before sending.
  .refine((v) => !(v.start_time && v.end_time) || v.end_time > v.start_time, {
    message: 'The end time must be after the start time.',
    path: ['end_time'],
  });

export type BookingRequestValues = z.infer<typeof bookingRequestSchema>;

export const emptyBookingRequestValues: BookingRequestValues = {
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  amount: '',
};

/**
 * Arguments for `create_booking`. The amount is a string in the form (that's
 * what the input yields) and a number at the RPC boundary.
 *
 * The times are optional at both ends and collapse to null rather than empty
 * strings — Postgres `time` would reject `''`, and null is what "not stated"
 * has always looked like on this table.
 *
 * The terms arrive separately rather than as form fields: the rail is a choice
 * between two priced cards and the advance is a slider bounded by a
 * server-supplied ceiling, so neither is something zod could usefully check
 * that the server does not already enforce.
 *
 * No event is named from a vendor's profile — that page has no idea the client
 * has any — so a booking started here never inherits event-wide terms. A client
 * who wants that books from the event itself, or from the bookings page.
 */
export function toBookingRequestArgs(
  values: BookingRequestValues,
  vendorId: string,
  terms: BookingTermsArgs,
) {
  return {
    p_vendor_id: vendorId,
    p_event_date: values.event_date,
    p_start_time: values.start_time || null,
    p_end_time: values.end_time || null,
    p_amount: Number(values.amount),
    p_currency: 'UGX',
    p_location: values.location.trim() || null,
    ...terms,
  };
}

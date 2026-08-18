import { z } from 'zod';
import { optionalTimeField, requiredDateField } from '@/lib/schema';
import type { BookingTermsArgs } from '@/pages/quotationDetail/schema';

/**
 * What the client expects this to cost.
 *
 * Required here, unlike on the vendor-profile request form, and required to be
 * more than zero. This form agrees payment terms at the same moment, and every
 * figure those terms turn on is a percentage of this one: an escrow booking for
 * an unstated amount would ask the client to consent to a service fee of
 * nothing and an advance of nothing, then charge them neither. "I do not know
 * yet" is a real answer — it is a request for a quote, not a booking.
 */
const bookingAmountField = z
  .string()
  .trim()
  .min(1, 'Enter what you expect this to cost.')
  .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
  .refine((v) => Number(v) > 0, 'Enter an amount greater than zero.');

/**
 * A booking made from nothing — no quote behind it, so the client states the
 * vendor, the date and what they expect to pay.
 *
 * This is the same request `BookingRequestForm` sends from a vendor's profile,
 * with two fields that page cannot ask for: the vendor (it already knows) and
 * the event (its panel has no idea the client has any). Both matter here — the
 * event is what makes a booking inherit event-wide payment terms, so a form
 * that could not name one would be a way to route around them.
 *
 * The rules mirror `create_booking`'s guards so the client hears them before a
 * round trip rather than after one.
 */
export const newBookingSchema = z
  .object({
    vendor_id: z.string().min(1, 'Choose a vendor.'),
    /** Optional: a booking need not belong to an event the client has posted. */
    event_id: z.string(),
    event_date: requiredDateField('Event date'),
    start_time: optionalTimeField('start time'),
    end_time: optionalTimeField('end time'),
    location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
    amount: bookingAmountField,
  })
  // An end with no start is not a window — there is nothing to count back from.
  .refine((v) => !(v.end_time && !v.start_time), {
    message: 'Add a start time as well.',
    path: ['start_time'],
  })
  .refine((v) => !(v.start_time && v.end_time) || v.end_time > v.start_time, {
    message: 'The end time must be after the start time.',
    path: ['end_time'],
  });

export type NewBookingValues = z.infer<typeof newBookingSchema>;

export const emptyNewBookingValues: NewBookingValues = {
  vendor_id: '',
  event_id: '',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  amount: '',
};

/**
 * Arguments for `create_booking`.
 *
 * The amount is a string in the form (that is what the input yields) and a
 * number at the RPC boundary. Times and the location collapse to null rather
 * than empty strings — Postgres `time` rejects `''`.
 *
 * `p_event_id` is what makes the server apply an event's payment terms over the
 * client's own choice, so it is sent even though the form treats it as
 * optional: omitting it on a booking the client filed under an event would
 * quietly opt that booking out of the terms the event exists to impose.
 */
export function toNewBookingArgs(values: NewBookingValues, terms: BookingTermsArgs) {
  return {
    p_vendor_id: values.vendor_id,
    p_event_date: values.event_date,
    p_amount: Number(values.amount),
    p_currency: 'UGX',
    p_service_id: null,
    p_quotation_id: null,
    p_event_id: values.event_id || null,
    p_location: values.location.trim() || null,
    p_start_time: values.start_time || null,
    p_end_time: values.end_time || null,
    ...terms,
  };
}

import { z } from 'zod';
import { optionalAmountField, optionalTimeField, requiredDateField } from '@/lib/schema';

export const bookingRequestSchema = z
  .object({
    event_date: requiredDateField('Event date'),
    start_time: optionalTimeField('start time'),
    end_time: optionalTimeField('end time'),
    location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
    amount: optionalAmountField('Estimated amount'),
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
 * what the input yields) and a number at the RPC boundary; blank means "not
 * estimated", which the RPC has always taken as 0.
 *
 * The times are optional at both ends and collapse to null rather than empty
 * strings — Postgres `time` would reject `''`, and null is what "not stated"
 * has always looked like on this table.
 */
export function toBookingRequestArgs(values: BookingRequestValues, vendorId: string) {
  return {
    p_vendor_id: vendorId,
    p_event_date: values.event_date,
    p_start_time: values.start_time || null,
    p_end_time: values.end_time || null,
    p_amount: values.amount.trim() === '' ? 0 : Number(values.amount),
    p_currency: 'UGX',
    p_location: values.location.trim() || null,
  };
}

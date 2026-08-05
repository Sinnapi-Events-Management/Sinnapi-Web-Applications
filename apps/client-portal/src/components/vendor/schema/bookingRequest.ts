import { z } from 'zod';
import { optionalAmountField, requiredDateField } from '@/lib/schema';

export const bookingRequestSchema = z.object({
  event_date: requiredDateField('Event date'),
  location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
  amount: optionalAmountField('Estimated amount'),
});

export type BookingRequestValues = z.infer<typeof bookingRequestSchema>;

export const emptyBookingRequestValues: BookingRequestValues = {
  event_date: '',
  location: '',
  amount: '',
};

/**
 * Arguments for `create_booking`. The amount is a string in the form (that's
 * what the input yields) and a number at the RPC boundary; blank means "not
 * estimated", which the RPC has always taken as 0.
 */
export function toBookingRequestArgs(values: BookingRequestValues, vendorId: string) {
  return {
    p_vendor_id: vendorId,
    p_event_date: values.event_date,
    p_amount: values.amount.trim() === '' ? 0 : Number(values.amount),
    p_currency: 'UGX',
    p_location: values.location.trim() || null,
  };
}

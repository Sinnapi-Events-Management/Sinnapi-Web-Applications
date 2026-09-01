import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { fromMinutes, paymentTermsError, toMinutes } from '@sinnapi/ui';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { usePaymentTermsChoice } from '@/components/paymentTerms/hooks/usePaymentTermsChoice';
import { bookingRequestSchema, emptyBookingRequestValues, toBookingRequestArgs } from '../schema';

/** The granularity of the time pickers, and so the shortest bookable window. */
const SLOT_MINUTES = 15;

/**
 * Sends a booking request to a vendor and follows it to the bookings list,
 * where the client can track the vendor's response.
 *
 * The request now carries payment terms as well as a date, because that is what
 * the vendor is answering. Before this, a vendor accepted a booking with no idea
 * whether the money would come through Sinnapi or be settled between the two of
 * them, and the client only met the cost of escrow at a checkout the vendor
 * never saw.
 *
 * The end time's floor is derived here rather than left to validation: an end
 * that cannot be earlier than its start is better than one that can be, and
 * then complains. It sits one slot above the start, because a zero-length
 * booking is not a booking.
 *
 * `eventDate` seeds the form when the request was started by tapping a free day
 * on the vendor's calendar. Showing somebody their date is available and then
 * handing them an empty date field is asking them to enter it twice.
 */
export function useBookingRequestForm(vendorId: string, onSuccess: () => void, eventDate?: string) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(bookingRequestSchema, {
    // A default rather than a `values` sync: the dialog unmounts this form on
    // close, so it is rebuilt with the current seed every time it opens, and a
    // date the client then edited would be overwritten by a `values` prop.
    defaultValues: { ...emptyBookingRequestValues, event_date: eventDate ?? '' },
  });

  const [startTime, amount] = useWatch({ control, name: ['start_time', 'amount'] });
  const startMinutes = toMinutes(startTime);
  const endMinTime = startMinutes === null ? undefined : fromMinutes(startMinutes + SLOT_MINUTES);

  // Priced against the typed estimate, since no quotation has settled a figure.
  // No event is involved on this path, so there are never inherited terms to
  // override what the client picks.
  const terms = usePaymentTermsChoice({ amount: Number(amount) || 0, currency: 'UGX' });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'create_booking',
      toBookingRequestArgs(values, vendorId, terms.args),
    );
    if (rpcError) {
      // Read rather than shown raw: `rpcError.message` on a PostgREST failure
      // is as likely to be a bare guard token as a sentence — see `rpcError.ts`.
      setError(paymentTermsError(rpcError));
      return;
    }
    onSuccess();
    navigate('/bookings');
  });

  return {
    control,
    error,
    busy: isSubmitting,
    submit,
    slotMinutes: SLOT_MINUTES,
    endMinTime,
    /** An end time means nothing until a start exists to measure it from. */
    endDisabled: startMinutes === null,
    terms,
    /**
     * Whether the estimate is high enough for either rail to be priced. Taken
     * from the terms hook rather than recomputed, so the form and the picker
     * cannot disagree about what counts as an amount.
     */
    hasAmount: terms.canPrice,
    canSubmit: !isSubmitting && !terms.isBlocked,
  };
}

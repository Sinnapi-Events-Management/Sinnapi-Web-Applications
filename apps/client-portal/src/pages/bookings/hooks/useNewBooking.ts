import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { fromMinutes, paymentTermsError, toMinutes } from '@sinnapi/ui';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { useMyEvents } from '@/hooks/queries';
import { usePaymentTermsChoice } from '@/components/paymentTerms/hooks/usePaymentTermsChoice';
import { emptyNewBookingValues, newBookingSchema, toNewBookingArgs } from '../schema';

/** The granularity of the time pickers, and so the shortest bookable window. */
const SLOT_MINUTES = 15;

/**
 * Booking a vendor from the bookings list: the form, the payment terms, the
 * single RPC, and where the client lands afterwards.
 *
 * WHY THIS EXISTS
 * Until now a client could only start a booking from a vendor's profile or from
 * an accepted quote, and the bookings page — the screen they open when they are
 * thinking about bookings — offered nothing but a link to Discover. That is a
 * detour through browsing for someone who already knows who they want.
 *
 * The amount is stated by the client here because no quotation has settled one.
 * It is an estimate the vendor confirms by accepting, which is exactly what it
 * has always been on the vendor-profile form — and it is why the terms
 * comparison below it re-prices as the figure is typed: the cost of escrow is a
 * percentage, so a client who has not entered an amount cannot be shown one.
 */
export function useNewBooking(onDone: () => void) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: events = [] } = useMyEvents();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(newBookingSchema, { defaultValues: emptyNewBookingValues });

  const [amount, eventId, startTime] = useWatch({
    control,
    name: ['amount', 'event_id', 'start_time'],
  });

  const startMinutes = toMinutes(startTime);
  const endMinTime = startMinutes === null ? undefined : fromMinutes(startMinutes + SLOT_MINUTES);

  // Filing the booking under an event is what binds it to that event's terms,
  // so the picker has to know which event is selected before the client
  // submits — otherwise they choose a rail and are silently overruled.
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId) ?? null,
    [events, eventId],
  );

  const terms = usePaymentTermsChoice({
    // The typed estimate, as a number. An unparseable or empty box prices
    // nothing rather than pricing zero — the preview query is disabled below
    // its own threshold, so the picker shows no figures until there is a real
    // amount to compare.
    amount: Number(amount) || 0,
    currency: 'UGX',
    eventRail: selectedEvent?.payment_type ?? null,
  });

  const submit = handleSubmit(async (values) => {
    setError(null);

    const { data, error: rpcError } = await supabase.rpc(
      'create_booking',
      toNewBookingArgs(values, terms.args),
    );

    if (rpcError) {
      setError(paymentTermsError(rpcError));
      return;
    }

    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });

    onDone();

    // Into the new booking rather than back to the list: the client's next
    // question is "has the vendor answered yet", and that is its own page.
    const bookingId = typeof data === 'string' ? data : null;
    if (bookingId) navigate(`/bookings/${bookingId}`);
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
    /** The client's own events, offered as an optional filing cabinet. */
    events,
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

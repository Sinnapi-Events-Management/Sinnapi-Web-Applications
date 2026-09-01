import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { bookingFromQuotationError, fromMinutes, localToday, toMinutes } from '@sinnapi/ui';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { usePaymentTermsChoice } from '@/components/paymentTerms/hooks/usePaymentTermsChoice';
import type { EventRefModel, QuotationDetailModel, QuotationOfferModel } from '@/lib/types';
import {
  bookingDateBounds,
  bookingFromQuotationSchema,
  defaultBookingDate,
  defaultBookingLocation,
  emptyBookingFromQuotationValues,
  toBookingFromQuotationArgs,
} from '../schema';

/** The granularity of the time pickers, and so the shortest bookable window. */
const SLOT_MINUTES = 15;

/**
 * Turning an accepted quote into a booking: the schedule, the payment terms,
 * the single RPC behind both, and where the client lands afterwards.
 *
 * The price, the vendor and the currency are still read off the quotation by
 * the server, which is what stops a booking made from a quote from disagreeing
 * with the quote it came from — see `schema/bookingFromQuotation.ts`.
 *
 * What the client now supplies alongside the date is how they intend to pay.
 * That belongs here and not at checkout: it is a term the vendor is agreeing to
 * when they confirm, and a vendor who accepted a booking before knowing whether
 * the money would come through Sinnapi or arrive by mobile money next month was
 * agreeing to only half of it.
 *
 * On success it navigates into the new booking rather than back to the list.
 * The client's next question is always the same one — "is it confirmed yet, and
 * what do I owe" — and that is the booking's own page, one tap closer.
 */
export function useCreateBookingFromQuotation(
  quotation: QuotationDetailModel,
  event: EventRefModel | null,
  /** The quote's total, already resolved against its line items. */
  total: number,
  /**
   * The offer this quote was priced with, when it carries one. Only its date
   * window is used here — it is what the booking's own date must fall inside.
   */
  offer: QuotationOfferModel | null,
  onDone: () => void,
) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const today = localToday();

  // The offer's window, as calendar bounds. Derived before the form so the
  // picker is fenced from its first render — a date greyed out is a rule
  // explained, where the same date accepted and then refused is an argument.
  const dateBounds = bookingDateBounds(offer, today);

  // Priced against the quote's own total rather than `quotation.total`: the
  // stored column can be zero on a quote whose lines are not — see
  // `quotationPricing` — and a terms comparison built on that zero would offer
  // the client a choice between paying nothing and paying nothing.
  const terms = usePaymentTermsChoice({
    amount: total,
    currency: quotation.currency,
    proposedAdvanceRate: quotation.advance_rate,
    eventRail: event?.payment_type ?? null,
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(bookingFromQuotationSchema, {
    defaultValues: {
      ...emptyBookingFromQuotationValues,
      // A package order already carries the date the client gave and the
      // vendor approved; a quote against one of the client's own events knows
      // the event's. Either way, pre-filling makes the common case a
      // confirmation rather than a second entry.
      event_date: defaultBookingDate(quotation.event_date, event?.event_date, today),
      // The address the vendor already approved. Editable — see the schema.
      location: defaultBookingLocation(quotation.event_address),
    },
  });

  // The end time's floor is derived rather than left to validation: an end that
  // *cannot* be earlier than its start is better than one that can be, and then
  // complains. It sits one slot above the start, because a zero-length booking
  // is not a booking.
  const startTime = useWatch({ control, name: 'start_time' });
  const startMinutes = toMinutes(startTime);
  const endMinTime = startMinutes === null ? undefined : fromMinutes(startMinutes + SLOT_MINUTES);

  const submit = handleSubmit(async (values) => {
    setError(null);

    const { data, error: rpcError } = await supabase.rpc(
      'create_booking_from_quotation',
      toBookingFromQuotationArgs(values, quotation.id, terms.args),
    );

    if (rpcError) {
      setError(bookingFromQuotationError(rpcError));
      // The most likely refusal is "a booking already exists", which means this
      // page is showing a stale answer to the question the card asked. Refetch
      // so the dialog's error and the card behind it agree on what happened.
      qc.invalidateQueries({ queryKey: ['quotation-booking', quotation.id] });
      qc.invalidateQueries({ queryKey: ['quotation-bookings'] });
      return;
    }

    // The new booking shows up in the list and on the dashboard's upcoming
    // strip, and the quotation page now has a booking where it had a button.
    qc.invalidateQueries({ queryKey: ['quotation-booking', quotation.id] });
    qc.invalidateQueries({ queryKey: ['quotation-bookings'] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });

    onDone();

    const bookingId = typeof data === 'string' ? data : null;
    navigate(bookingId ? `/bookings/${bookingId}` : '/bookings');
  });

  return {
    control,
    error,
    busy: isSubmitting,
    submit,
    slotMinutes: SLOT_MINUTES,
    /** The days the calendar will offer, narrowed by the offer when there is one. */
    ...dateBounds,
    endMinTime,
    /** An end time means nothing until a start exists to measure it from. */
    endDisabled: startMinutes === null,
    /** The rail, its price and the advance the client has agreed to. */
    terms,
    /**
     * The submit button's own rule. Kept apart from `busy` so the dialog can
     * disable the button for an unfinished consent without also claiming a
     * request is in flight.
     */
    canSubmit: !isSubmitting && !terms.isBlocked,
  };
}

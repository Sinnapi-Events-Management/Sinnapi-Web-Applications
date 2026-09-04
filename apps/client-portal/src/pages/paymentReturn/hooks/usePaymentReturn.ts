import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import {
  PAYMENT_POLL_BUDGET_MS,
  PAYMENT_TERMINAL_STATUSES,
  paymentPollDelay,
  readPaymentReturnParams,
} from '@sinnapi/ui/payments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useBooking, useBookingEscrow, usePaymentById } from '@/hooks/queries';
import type { PaymentReturnModel } from '@/lib/types';

/**
 * The page's states, in the order a client is likely to meet them.
 *
 * `checking` and `processing` are the same fact — the IPN has not landed —
 * told at two different moments. For the first half minute the page is
 * confident the answer is seconds away and says so with a progress bar; after
 * the budget it stops asking and tells the client what happens instead.
 * Rendering those as one state with a timer inside the component would hide
 * the second sentence in the first one's markup.
 */
export type ReturnState =
  | 'invalid'
  | 'loading'
  | 'not_found'
  | 'checking'
  | 'processing'
  | 'confirmed'
  | 'failed';

/** What the payment was for. Decides which confirmation the page renders. */
export type ReturnPurpose = 'escrow_funding' | 'subscription' | 'other';

/**
 * Everything the return page needs to say what happened to a payment.
 *
 * The status is never taken from the URL. Pesapal deliberately leaves it off
 * both the callback and the IPN, so the only thing this page trusts is our own
 * `payments` row, read as the signed-in payer through RLS, whose status is
 * written by the webhook after it re-queried Pesapal. The query string only
 * says which row to read, and the tracking id it carries is checked against
 * the one the server stored when the checkout was opened.
 *
 * The page does not assume the payment funded an escrow. It reads the row's
 * `purpose` and only then reaches for the booking and the escrow — a
 * subscription payment that lands here (the vendor portal's return route is
 * the intended destination, but a default callback can send it here) is told
 * about honestly rather than shown an empty escrow breakdown.
 *
 * Two ways of finding out the IPN has landed run side by side: a bounded,
 * backing-off poll and a realtime subscription on the same row. The
 * subscription is the fast path; the poll is what still works when the
 * websocket did not connect, and it gives up rather than spinning forever.
 */
export function usePaymentReturn() {
  const [params] = useSearchParams();
  const ret = useMemo(() => readPaymentReturnParams(params), [params]);
  const paymentId = ret?.paymentId;

  const qc = useQueryClient();
  const { user } = useAuth();

  useBreadcrumbTitle('Payment result');

  // The budget is measured from the moment the page opened, not from the
  // first response: a slow first fetch is time the client has already spent
  // waiting.
  const startedAt = useRef(Date.now());
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setExpired(true), PAYMENT_POLL_BUDGET_MS);
    return () => clearTimeout(t);
  }, []);

  const refetchInterval = useCallback((query: { state: { data?: unknown } }) => {
    const p = query.state.data as PaymentReturnModel | null | undefined;
    // Nothing to wait for: no row we may read, or an answer already given.
    if (!p || PAYMENT_TERMINAL_STATUSES.has(p.status)) return false;
    const elapsed = Date.now() - startedAt.current;
    if (elapsed >= PAYMENT_POLL_BUDGET_MS) return false;
    return paymentPollDelay(elapsed);
  }, []);

  const payment = usePaymentById(paymentId, { refetchInterval });
  const row = payment.data ?? null;

  const purpose: ReturnPurpose =
    row?.purpose === 'escrow_funding'
      ? 'escrow_funding'
      : row?.purpose === 'subscription'
        ? 'subscription'
        : 'other';

  // Only an escrow payment has a booking to show; the queries stay idle for
  // anything else rather than asking for rows that do not exist.
  const bookingId = purpose === 'escrow_funding' ? (row?.booking_id ?? undefined) : undefined;

  const escrow = useBookingEscrow(bookingId);
  const booking = useBooking(bookingId);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['payment', paymentId] });
    void qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
    void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    void qc.invalidateQueries({ queryKey: ['payments'] });
  }, [qc, paymentId, bookingId]);

  // Stays subscribed after the poll gives up on purpose: an IPN that lands two
  // minutes late still flips this page to "confirmed" if it is still open.
  useRealtimeRefresh({
    client: supabase,
    channel: `payment-return:${paymentId ?? 'none'}`,
    enabled: !!paymentId,
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: 'payments', filter: `id=eq.${paymentId}` },
        ...(bookingId
          ? [{ table: 'escrow_transactions', filter: `booking_id=eq.${bookingId}` }]
          : []),
      ],
      [paymentId, bookingId],
    ),
  });

  let state: ReturnState;
  if (!ret) {
    state = 'invalid';
  } else if (payment.isLoading) {
    state = 'loading';
  } else if (!row) {
    // RLS hides rows that are not ours, so "not visible" and "does not exist"
    // are the same answer here, and the right one for a link lifted from
    // someone else's return.
    state = 'not_found';
  } else if (
    ret.trackingId &&
    row.provider_ref &&
    row.provider_ref.toLowerCase() !== ret.trackingId.toLowerCase()
  ) {
    // The reference the browser brought back is not the one the server
    // stored when it opened this checkout. Say nothing about the payment.
    state = 'not_found';
  } else if (row.status === 'succeeded') {
    state = 'confirmed';
  } else if (PAYMENT_TERMINAL_STATUSES.has(row.status)) {
    state = 'failed';
  } else {
    state = expired ? 'processing' : 'checking';
  }

  return {
    state,
    purpose,
    error: payment.error,
    payment: row,
    escrow: escrow.data ?? null,
    isEscrowLoading: !!bookingId && escrow.isLoading,
    /** What the client quotes to support, and what the email will carry. */
    bookingRef: booking.data?.reference_no ?? null,
    /** Where the notification goes, so the page can say so rather than "you". */
    email: user?.email ?? null,
    /** Back to the booking's Money tab — the retry, and the place to watch. */
    bookingHref: bookingId ? `/bookings/${bookingId}?tab=money` : '/bookings',
    checkAgain: () => void payment.refetch(),
    isChecking: payment.isFetching,
  };
}

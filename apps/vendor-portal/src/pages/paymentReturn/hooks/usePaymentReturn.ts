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
import { usePaymentById, useSubscriptionById } from '@/hooks/queries';
import type { PaymentReturnModel } from '@/lib/types';

/**
 * The page's states, in the order a vendor is likely to meet them. See the
 * client portal's return page for why `checking` and `processing` are two
 * states for one fact.
 */
export type ReturnState =
  | 'invalid'
  | 'loading'
  | 'not_found'
  | 'checking'
  | 'processing'
  | 'confirmed'
  | 'failed';

/**
 * Everything the vendor return page needs to say what happened to a payment.
 *
 * The status is never taken from the URL: Pesapal leaves it off on purpose,
 * so the only thing trusted is our own `payments` row, read as the payer
 * through RLS and written by the webhook after it re-queried Pesapal. The
 * subscription row is read alongside so a confirmed page can show the period
 * that was actually written, not the one previewed at checkout.
 *
 * The page reads the payment's purpose and only handles the one this portal
 * pays for. An escrow payment that lands here (it should not — the callback
 * for those points at the client portal) is reported as not found rather than
 * described with subscription copy.
 */
export function usePaymentReturn() {
  const [params] = useSearchParams();
  const ret = useMemo(() => readPaymentReturnParams(params), [params]);
  const paymentId = ret?.paymentId;

  const qc = useQueryClient();
  const { user } = useAuth();

  useBreadcrumbTitle('Payment result');

  const startedAt = useRef(Date.now());
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setExpired(true), PAYMENT_POLL_BUDGET_MS);
    return () => clearTimeout(t);
  }, []);

  const refetchInterval = useCallback((query: { state: { data?: unknown } }) => {
    const p = query.state.data as PaymentReturnModel | null | undefined;
    if (!p || PAYMENT_TERMINAL_STATUSES.has(p.status)) return false;
    const elapsed = Date.now() - startedAt.current;
    if (elapsed >= PAYMENT_POLL_BUDGET_MS) return false;
    return paymentPollDelay(elapsed);
  }, []);

  const payment = usePaymentById(paymentId, { refetchInterval });
  const row = payment.data ?? null;
  const subscriptionId =
    row?.purpose === 'subscription' ? (row.subscription_id ?? undefined) : undefined;
  const subscription = useSubscriptionById(subscriptionId);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['payment', paymentId] });
    void qc.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    void qc.invalidateQueries({ queryKey: ['my-subscription'] });
    void qc.invalidateQueries({ queryKey: ['my-subscription-detail'] });
    void qc.invalidateQueries({ queryKey: ['my-vendor'] });
    void qc.invalidateQueries({ queryKey: ['subscription-payments'] });
  }, [qc, paymentId, subscriptionId]);

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
        ...(subscriptionId ? [{ table: 'subscriptions', filter: `id=eq.${subscriptionId}` }] : []),
      ],
      [paymentId, subscriptionId],
    ),
  });

  let state: ReturnState;
  if (!ret) {
    state = 'invalid';
  } else if (payment.isLoading) {
    state = 'loading';
  } else if (!row || row.purpose !== 'subscription') {
    // RLS hides rows that are not ours, so "not visible" and "does not exist"
    // are the same answer; so is a payment this portal does not handle.
    state = 'not_found';
  } else if (
    ret.trackingId &&
    row.provider_ref &&
    row.provider_ref.toLowerCase() !== ret.trackingId.toLowerCase()
  ) {
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
    error: payment.error,
    payment: row,
    subscription: subscription.data ?? null,
    isSubscriptionLoading: !!subscriptionId && subscription.isLoading,
    /** Where the notification goes, so the page can say so rather than "you". */
    email: user?.email ?? null,
    checkAgain: () => void payment.refetch(),
    isChecking: payment.isFetching,
  };
}

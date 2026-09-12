import { useMemo } from 'react';
import type { AccentColor } from '@sinnapi/ui';
import { checkoutRailLabel, describePaymentFailure } from '@sinnapi/ui/payments';
import { APP, formatMoney } from '@/lib/config';
import type { PaymentReturnModel } from '@/lib/types';
import type { ReturnState } from './usePaymentReturn';

type Props = {
  state: Exclude<ReturnState, 'invalid' | 'loading' | 'not_found'>;
  payment: PaymentReturnModel;
  email: string | null;
};

type Notice = { severity: 'success' | 'error' | 'info'; text: string };

export type SubscriptionOutcome = {
  accent: AccentColor;
  title: string;
  description: string;
  notice: Notice | null;
  /** Absolute link to the vendor portal, when its origin is configured. */
  manageHref: string | null;
  /** Still waiting on the provider — drives the mark's breathing halo. */
  waiting: boolean;
};

/**
 * What a subscription payment that landed on the *client* return route says.
 *
 * Four states, each with its own accent, verdict, sentence and alert — a
 * branch per field inside JSX is how the old card grew three near-identical
 * `SectionCard` returns. One object, decided here, and the card places it.
 *
 * `manageHref` is null rather than a relative path when `vendorPortalUrl` is
 * unset: the vendor portal is a separate origin, and a `/subscription` link
 * from here would resolve against the client portal and 404. No link is
 * better than a broken one.
 */
export function useSubscriptionOutcome({ state, payment, email }: Props): SubscriptionOutcome {
  return useMemo(() => {
    const amount = formatMoney(payment.amount, payment.currency);
    const rail = checkoutRailLabel(payment.provider, payment.provider_method);
    const manageHref = APP.vendorPortalUrl
      ? `${APP.vendorPortalUrl.replace(/\/$/, '')}/subscription`
      : null;

    if (state === 'confirmed') {
      return {
        accent: 'success',
        title: 'Subscription paid',
        description: email
          ? `A confirmation with your period dates is on its way to ${email}.`
          : 'A confirmation with your period dates is on its way.',
        notice: { severity: 'success', text: `${amount} received. Your plan is now active.` },
        manageHref,
        waiting: false,
      };
    }

    if (state === 'failed') {
      return {
        accent: 'error',
        title: 'Payment not completed',
        description: 'Your current plan is unchanged.',
        notice: {
          severity: 'error',
          text: describePaymentFailure(payment.status, payment.failure_reason),
        },
        manageHref,
        waiting: false,
      };
    }

    if (state === 'cancelled') {
      return {
        accent: 'warning',
        title: 'Payment cancelled',
        description: 'You left the checkout before it was completed. No money was taken.',
        notice: { severity: 'info', text: 'Your current plan is unchanged.' },
        manageHref,
        waiting: false,
      };
    }

    const checking = state === 'checking';
    return {
      accent: checking ? 'secondary' : 'warning',
      title: checking ? 'Confirming your payment' : 'Still processing',
      description: checking
        ? `We're waiting for ${rail} to confirm ${amount}. This usually takes a few seconds; there is nothing you need to do.`
        : `${rail} has not confirmed ${amount} yet. That can take a few minutes when a mobile-money prompt is answered late. Your plan activates on its own the moment it clears.`,
      notice: checking
        ? null
        : {
            severity: 'info',
            text: "Please don't pay again. A second checkout is refused while this one is open.",
          },
      manageHref,
      waiting: checking,
    };
  }, [state, payment, email]);
}

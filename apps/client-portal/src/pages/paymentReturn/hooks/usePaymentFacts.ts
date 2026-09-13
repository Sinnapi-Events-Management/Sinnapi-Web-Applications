import { useMemo } from 'react';
import type { PaymentFact } from '@sinnapi/ui/payments';
import { checkoutRailLabel } from '@sinnapi/ui/payments';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { PaymentReturnModel } from '@/lib/types';

type Props = {
  payment: PaymentReturnModel;
  bookingRef: string | null;
};

/**
 * The facts worth surfacing about a payment with no receipt yet.
 *
 * The pending and failed states used to bury the reference in a sentence
 * ("Quote booking SB14B76HC0 if you contact support"), which asks the one
 * person already having a bad time to select text out of a paragraph. These
 * rows are copyable instead.
 *
 * The provider's own tracking id is included only when we have it: it is what
 * Pesapal's support desk searches on, and it is the difference between a
 * resolvable ticket and a description of one.
 */
export function usePaymentFacts({ payment, bookingRef }: Props): PaymentFact[] {
  return useMemo(() => {
    const facts: PaymentFact[] = [
      { label: 'Amount', value: formatMoney(payment.amount, payment.currency) },
      { label: 'Method', value: checkoutRailLabel(payment.provider, payment.provider_method) },
    ];

    if (bookingRef) {
      facts.push({ label: 'Booking', value: bookingRef, mono: true, copyValue: bookingRef });
    }

    if (payment.provider_ref) {
      facts.push({
        label: 'Reference',
        value: payment.provider_ref,
        mono: true,
        copyValue: payment.provider_ref,
      });
    }

    facts.push({ label: 'Started', value: formatDateTime(payment.created_at) });

    return facts;
  }, [payment, bookingRef]);
}

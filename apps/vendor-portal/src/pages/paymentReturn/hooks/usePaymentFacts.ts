import { useMemo } from 'react';
import type { PaymentFact } from '@sinnapi/ui/payments';
import { checkoutRailLabel } from '@sinnapi/ui/payments';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { PaymentReturnModel } from '@/lib/types';

/**
 * The facts worth surfacing about a subscription payment with no receipt yet.
 *
 * The provider's tracking id is what Pesapal's support desk searches on, so
 * it is offered copyable rather than described in prose — a vendor chasing a
 * payment that has not cleared should not have to select text out of a
 * paragraph to quote it.
 */
export function usePaymentFacts(payment: PaymentReturnModel): PaymentFact[] {
  return useMemo(() => {
    const facts: PaymentFact[] = [
      { label: 'Amount', value: formatMoney(payment.amount, payment.currency) },
      { label: 'Method', value: checkoutRailLabel(payment.provider, payment.provider_method) },
    ];

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
  }, [payment]);
}

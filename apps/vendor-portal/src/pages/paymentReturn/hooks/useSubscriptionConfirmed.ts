import { useMemo, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/lib/config';
import type { MySubscriptionModel, PaymentReturnModel } from '@/lib/types';

type Props = {
  payment: PaymentReturnModel;
  subscription: MySubscriptionModel | null;
  email: string | null;
};

/**
 * What a paid subscription tells its vendor.
 *
 * The period comes from the subscription row, not from the checkout preview:
 * `activate_subscription` wrote it when the IPN landed, and this is the same
 * figure the confirmation email carries. Reading it off the plan's billing
 * cycle here instead would let the page and the email disagree about when the
 * vendor's listing stops being live.
 *
 * Nothing renews itself — `auto_renew` drives reminders only — so that is
 * stated as a step rather than left for a vendor to discover when their
 * listing goes dark.
 */
export function useSubscriptionConfirmed({ payment, subscription: s, email }: Props) {
  return useMemo(() => {
    const steps: ReactNode[] = [
      'Your public listing is live now. Clients can find and book you straight away.',
      s?.current_period_end
        ? `This period runs to ${formatDate(s.current_period_end)}. We will remind you before it ends so you can renew in time.`
        : 'We will remind you before this period ends so you can renew in time.',
      'Nothing is charged automatically. Every renewal is a payment you open yourself.',
      email ? `A receipt is on its way to ${email}.` : 'A receipt is on its way to your email.',
    ];

    const facts = s
      ? [
          { label: 'Plan', value: s.plan?.name ?? '—' },
          { label: 'Period starts', value: formatDate(s.current_period_start) },
          { label: 'Period ends', value: formatDate(s.current_period_end) },
        ]
      : [];

    return {
      steps,
      facts,
      planName: s?.plan?.name ?? null,
      totalAmount: formatMoney(payment.amount, payment.currency),
    };
  }, [payment, s, email]);
}

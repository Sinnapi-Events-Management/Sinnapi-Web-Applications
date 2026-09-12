import { useMemo } from 'react';
import type { MoneyBreakdownProps } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { EscrowDetailModel, PaymentReturnModel } from '@/lib/types';

type Props = {
  payment: PaymentReturnModel;
  escrow: EscrowDetailModel | null;
  isEscrowLoading: boolean;
  email: string | null;
};

/**
 * `formatMoney` in the portal's shape, for `MoneyBreakdown`'s `format` slot.
 *
 * A breakdown line may carry its amount as a string — numerics come back from
 * PostgREST that way whenever precision would be lost in a JS number — while
 * `formatMoney` takes a number. Coercing here keeps that conversion in one
 * place, and a value that is not a finite number renders as an em dash rather
 * than `USh NaN`: "we do not know" and "nothing" are different statements to
 * make about money.
 */
function money(amount: number | string | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '—';
  return formatMoney(value, currency);
}

function longDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Everything the confirmed card says, worked out from the escrow row.
 *
 * The card that renders this is layout only, deliberately: what a client is
 * told after paying into escrow depends on an advance rate, a release date
 * that may already be behind us, and whether we know their email — three
 * branches that belong in a hook a test can call, not in JSX.
 *
 * Amounts are formatted here, once, through the portal's own `formatMoney`.
 * The breakdown is handed the same function so its line items read `USh` like
 * the total above them; the shared `MoneyBreakdown` otherwise prints the ISO
 * code, which is how the old card showed `USh 500,000` as its headline and
 * `UGX 400,000` in the itemisation directly beneath.
 */
export function usePaymentConfirmed({ payment, escrow, isEscrowLoading, email }: Props) {
  return useMemo(() => {
    const currency = escrow?.currency ?? payment.currency ?? 'UGX';
    const advanceRate = Number(escrow?.advance_rate ?? 0);
    const advanceDue = longDate(escrow?.advance_release_due_at ?? null);

    // `held` straight after funding means the release date was already behind
    // us, so the advance is on its way now rather than on a date.
    const advanceNow =
      !!escrow && (escrow.status === 'held' || !!escrow.advance_released_at) && advanceRate > 0;

    const steps = [
      'Your vendor has been told the money is secured, and can now prepare for your event.',
      advanceRate <= 0
        ? 'Nothing is released before your event. The full amount stays protected by Sinnapi.'
        : advanceNow
          ? `The ${formatMoney(escrow?.advance_amount, currency)} advance (${advanceRate}%) is being released to your vendor now, because the release date has already passed.`
          : `${formatMoney(escrow?.advance_amount, currency)} (${advanceRate}% advance) is released to your vendor${advanceDue ? ` on ${advanceDue}` : ' before the event'}.`,
      `The remaining ${formatMoney(escrow?.balance_amount, currency)} stays protected until you confirm the service was delivered, after the event.`,
      email
        ? `A confirmation is on its way to ${email}. Nothing else is needed from you today.`
        : 'A confirmation email is on its way. Nothing else is needed from you today.',
    ];

    // The headline figure is what actually left the client's account — the
    // agreed amount plus the fees charged on top of it — not the amount they
    // negotiated with the vendor. `gross_amount` is that sum; the old card
    // headlined `agreed_amount`, which under-reported what had been paid.
    const paidAmount = escrow?.gross_amount ?? payment.amount ?? null;

    const breakdown: MoneyBreakdownProps | null = escrow
      ? {
          currency,
          format: money,
          lines: [
            { label: 'Agreed with your vendor', amount: escrow.agreed_amount },
            {
              label: `Sinnapi service fee (${Number(escrow.commission_rate ?? 0)}%)`,
              amount: escrow.commission_amount,
              additive: true,
            },
            {
              label: `Processing fee (${Number(escrow.psp_fee_rate ?? 0)}%)`,
              amount: escrow.psp_fee_amount,
              additive: true,
            },
          ],
          total: { label: 'Paid', amount: escrow.gross_amount },
          afterTotal: [
            {
              label: 'Released before the event',
              amount: escrow.advance_amount,
              muted: true,
            },
            {
              label: 'Held until you confirm',
              amount: escrow.balance_amount,
              muted: true,
            },
          ],
        }
      : null;

    return {
      isEscrowLoading,
      steps,
      totalAmount: money(paidAmount, currency),
      breakdown,
    };
  }, [payment, escrow, isEscrowLoading, email]);
}

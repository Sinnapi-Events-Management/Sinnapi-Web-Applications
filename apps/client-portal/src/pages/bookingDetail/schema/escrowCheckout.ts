import type { MoneyLine } from '@sinnapi/ui';
import type { EscrowQuoteModel } from '@/lib/types';

/**
 * The lines an escrow charge is built from, above the total.
 *
 * Commission and the processing fee are charged on top of the agreed amount,
 * so the client pays more than the price they negotiated; each part is named
 * with what it is for, so the total never reads as a surprise.
 */
export function escrowChargeLines(quote: EscrowQuoteModel, processor: string): MoneyLine[] {
  return [
    {
      label: 'Agreed with your vendor',
      amount: quote.agreed_amount,
      hint: 'The full amount your vendor receives. Sinnapi does not take a cut of this.',
    },
    {
      label: `Sinnapi service fee (${Number(quote.commission_rate)}%)`,
      amount: quote.commission_amount,
      additive: true,
      hint: 'What it costs to hold your money securely, mediate any issues, and guarantee the vendor is paid.',
    },
    {
      label: `Processing fee (${Number(quote.psp_fee_rate)}%)`,
      amount: quote.psp_fee_amount,
      additive: true,
      hint: `Charged by ${processor} to process the payment. This varies by payment method.`,
    },
  ];
}

/**
 * How the same money is released in time, below the total.
 *
 * Choosing a different advance moves these lines and never the total: fees
 * are charged on the agreed amount, so the split cannot change what leaves the
 * client's account.
 */
export function escrowReleaseLines(quote: EscrowQuoteModel): MoneyLine[] {
  return [
    {
      label: 'Released before the event',
      amount: quote.advance_amount,
      muted: true,
      hint: `${Number(quote.advance_rate)}% of the amount agreed with your vendor, paid out on the release date whether or not the event has happened yet. The fees are not part of this split.`,
    },
    {
      label: 'Held until you confirm',
      amount: quote.balance_amount,
      muted: true,
      hint: 'Sinnapi keeps this until you confirm the service was delivered, then releases it to your vendor.',
    },
  ];
}

'use client';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { MoneyBreakdown, type MoneyLine } from './MoneyBreakdown';
import { formatRate } from './money';
import { pspFeeRangeLabel, type PaymentRail, type PaymentTermsPreview } from './paymentTerms';

export type PaymentTermsBreakdownProps = {
  preview: PaymentTermsPreview | null;
  rail: PaymentRail;
  /** Days before the event the advance is released, from the quote's terms. */
  advanceDaysBefore?: number | null;
  /**
   * A first price is genuinely on its way. Only this draws the skeleton —
   * see the note on the render below.
   */
  isLoading?: boolean;
  /** Dims the figures while a new preview is in flight. */
  isPricing?: boolean;
  /**
   * Why there are no figures, when there are none and none are coming: no
   * amount to price yet, or a preview that failed. Rendered in place of the
   * breakdown so the absence explains itself.
   */
  unavailableReason?: string | null;
};

/**
 * What the chosen rail actually costs, itemised.
 *
 * Escrow's commission and processing fee are charged *on top of* the price
 * negotiated with the vendor, so the total is never shown without the lines
 * that build it. That is the whole point of this component: a client who sees
 * only "Total to pay" has been told the number but not the deal.
 *
 * The off-platform rail gets the same component rather than a paragraph, so the
 * two are read the same way and the zero fees are a line the client can point
 * at rather than an absence they have to notice.
 *
 * Figures come from `payment_terms_preview`, which is the same arithmetic
 * `escrow_price_booking` charges by. A preview that disagrees with the charge
 * would be worse than no preview.
 */
export function PaymentTermsBreakdown({
  preview,
  rail,
  advanceDaysBefore,
  isLoading,
  isPricing,
  unavailableReason,
}: PaymentTermsBreakdownProps) {
  // A skeleton is a promise that something is coming. It is drawn only for
  // `isLoading`, never for "there is no preview" — those are different states
  // and conflating them is how this component came to hang forever.
  //
  // `isLoading` in TanStack Query v5 is `isPending && isFetching`, so it is
  // *false* for both a disabled query (nothing to price yet) and a failed one.
  // Keying the skeleton off `!preview` therefore left both cases showing three
  // grey bars that would never resolve, with any error swallowed entirely.
  if (isLoading) {
    return (
      <Stack spacing={1}>
        <Skeleton height={22} />
        <Skeleton height={22} />
        <Skeleton height={32} />
      </Stack>
    );
  }

  if (!preview) {
    return (
      <Alert severity="info" variant="outlined">
        {unavailableReason ??
          'We cannot work out what this would cost yet. The amount has to be set before either ' +
            'way of paying can be priced.'}
      </Alert>
    );
  }

  const currency = preview.currency;
  const feeRange = pspFeeRangeLabel(preview);
  const isEscrow = rail === 'escrow';

  return (
    <Box
      sx={{ opacity: isPricing ? 0.5 : 1, transition: 'opacity .15s' }}
      aria-busy={isPricing || undefined}
    >
      <MoneyBreakdown
        currency={currency}
        lines={isEscrow ? escrowLines(preview, feeRange) : directLines(preview)}
        total={{
          label: isEscrow ? 'Most you will pay' : 'Total to pay',
          amount: isEscrow ? preview.escrow_total_max : preview.direct_total,
          hint: isEscrow
            ? 'Quoted at the highest processing fee of any payment method. Mobile money costs ' +
              'less than a card, so the amount charged at checkout may be lower — never higher.'
            : 'You pay this to the vendor yourself. Sinnapi adds nothing.',
        }}
        afterTotal={isEscrow ? escrowSplit(preview, advanceDaysBefore) : undefined}
        footnote={
          <Stack direction="row" spacing={0.75} alignItems="flex-start">
            <Box
              component={isEscrow ? LockIcon : ReportProblemOutlinedIcon}
              sx={{ fontSize: 15, mt: '2px', color: isEscrow ? 'inherit' : 'warning.main' }}
            />
            <span>
              {isEscrow
                ? 'Sinnapi holds this money and releases it to your vendor on the schedule above. ' +
                  'Your card or wallet details are entered on the provider’s own secure page.'
                : 'This payment happens outside Sinnapi. We do not hold it, we cannot refund it, ' +
                  'and we cannot mediate if something goes wrong.'}
            </span>
          </Stack>
        }
      />
    </Box>
  );
}

/** The build-up on the protected rail: price, commission, processing fee. */
function escrowLines(preview: PaymentTermsPreview, feeRange: string | null): MoneyLine[] {
  return [
    {
      label: 'Agreed with your vendor',
      amount: preview.agreed_amount,
      hint: 'The full amount your vendor receives. Sinnapi does not take a cut of this.',
    },
    {
      label: `Sinnapi service fee (${formatRate(preview.commission_rate)})`,
      amount: preview.commission_amount,
      additive: true,
      hint:
        'What it costs to hold your money securely, mediate any issues, and guarantee your ' +
        'vendor is paid.',
    },
    {
      label: `Processing fee${feeRange ? ` (${feeRange})` : ''}`,
      amount: preview.psp_fee_max,
      additive: true,
      hint:
        'Charged by the payment provider, not by Sinnapi. It varies by method — mobile money is ' +
        'the cheapest, cards and PayPal cost more — so this is the highest of them.',
    },
  ];
}

/** The off-platform rail, stated as lines so the zeroes are visible. */
function directLines(preview: PaymentTermsPreview): MoneyLine[] {
  return [
    {
      label: 'Agreed with your vendor',
      amount: preview.agreed_amount,
      hint: 'Paid by you to the vendor directly, however the two of you arrange it.',
    },
    {
      label: 'Sinnapi service fee',
      amount: 0,
      hint: 'Sinnapi charges nothing on a booking settled off the platform.',
    },
    {
      label: 'Processing fee',
      amount: 0,
      hint: 'No payment passes through a provider here, so there is nothing to process.',
    },
  ];
}

/** How the same money divides in time. Never additive — it splits the total. */
function escrowSplit(preview: PaymentTermsPreview, daysBefore: number | null | undefined) {
  return [
    {
      label: `Of which — released before the event (${formatRate(preview.advance_rate)})`,
      amount: preview.advance_amount,
      muted: true,
      hint:
        daysBefore != null && daysBefore > 0
          ? `Paid out to your vendor ${daysBefore} days before your event, whether or not it has ` +
            'happened yet. The fees above are not part of this split.'
          : 'Paid out to your vendor once the booking is funded. The fees above are not part of ' +
            'this split.',
    },
    {
      label: 'Of which — held until you confirm',
      amount: preview.balance_amount,
      muted: true,
      hint: 'Sinnapi keeps this until you confirm the service was delivered.',
    },
  ];
}

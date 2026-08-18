'use client';
import { Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Alert } from './Alert';
import { InfoRow } from './InfoRow';
import { formatAmount } from './money';
import type { QuoteVariance } from './quotationPricing';

/** Who is reading, which decides only what the difference means for them. */
export type QuoteVariancePerspective = 'client' | 'vendor' | 'admin';

export type QuoteVarianceNoteProps = {
  /** From `quoteVariance(quotedTotal, bookedAmount)`. */
  variance: QuoteVariance;
  currency?: string | null;
  perspective: QuoteVariancePerspective;
};

/**
 * The booking amount set beside the quoted total, and what to make of a gap.
 *
 * The matching case still renders. "These agree" is the answer to the question
 * that brought someone to compare them, and a card that only speaks up when
 * something is wrong leaves the reader unable to tell "checked, fine" from
 * "not checked".
 *
 * The gap itself is stated without blame in all three portals: a booking above
 * its quote is usually an agreed addition and occasionally an error, and this
 * component cannot tell which. It reports the difference and says who would
 * know — which is the honest version, and the one that does not accuse a
 * vendor of overcharging in the client's own portal.
 */
export function QuoteVarianceNote({ variance, currency, perspective }: QuoteVarianceNoteProps) {
  if (!variance.comparable) return null;

  const cur = currency ?? 'UGX';
  const gap = formatAmount(Math.abs(variance.delta), cur);
  const higher = variance.direction === 'above';

  return (
    <Stack spacing={1.5}>
      <InfoRow
        label="Booked amount"
        icon={<ReceiptLongIcon />}
        value={formatAmount(variance.booked, cur)}
      />

      {variance.differs && (
        <Alert severity="warning" variant="outlined">
          {`This booking is ${gap} ${higher ? 'more' : 'less'} than the quote it was made from. `}
          {DIFFERENCE_NOTE[perspective]}
        </Alert>
      )}
    </Stack>
  );
}

const DIFFERENCE_NOTE: Record<QuoteVariancePerspective, string> = {
  client:
    'That can be something you and your vendor agreed after the quote was sent. If it is not, ' +
    'ask them before paying — the booking amount is what you will be charged.',
  vendor:
    'That can be a change agreed with the client after the quote was sent. If it is not, raise ' +
    'it before the event — the booking amount is what you will be paid against.',
  admin:
    'The booking was created at the quoted figure, so the difference was made afterwards. Check ' +
    'the activity trail before treating either number as the agreed price.',
};

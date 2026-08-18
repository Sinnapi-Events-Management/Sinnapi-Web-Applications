import { Box, MoneyBreakdown, Skeleton, Stack } from '@sinnapi/ui';
import LockIcon from '@mui/icons-material/Lock';
import type { EscrowQuoteModel } from '@/lib/types';

type Props = {
  quote: EscrowQuoteModel | null;
  currency: string | null;
  /** The rail the fee is quoted for, named in the fee hint and the footnote. */
  railLabel: string;
  isLoading?: boolean;
  /** Dims the figures while a new quote is in flight. */
  isRepricing?: boolean;
};

/**
 * What the client pays, and how that payment is then scheduled.
 *
 * Two blocks separated by the total, because they answer different questions.
 * Above it: what is charged, and why it is more than the price negotiated with
 * the vendor. Below it: how the same money is split in time. Choosing a
 * different advance moves the lines under the total and never the total
 * itself — commission and the processing fee are charged on the agreed
 * amount, so the split cannot change what leaves the client's account.
 */
export default function EscrowCostBreakdown({
  quote,
  currency,
  railLabel,
  isLoading,
  isRepricing,
}: Props) {
  if (isLoading || !quote) {
    return (
      <Stack spacing={1}>
        <Skeleton height={22} />
        <Skeleton height={22} />
        <Skeleton height={22} />
        <Skeleton height={32} />
      </Stack>
    );
  }

  return (
    <Box
      sx={{ opacity: isRepricing ? 0.5 : 1, transition: 'opacity .15s' }}
      aria-busy={isRepricing || undefined}
    >
      <MoneyBreakdown
        currency={currency ?? 'UGX'}
        lines={[
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
            hint: `Charged by ${railLabel} to process the payment. This varies by payment method.`,
          },
        ]}
        total={{ label: 'Total to pay', amount: quote.gross_amount }}
        afterTotal={[
          {
            label: 'Of which — released before the event',
            amount: quote.advance_amount,
            muted: true,
            hint: `${Number(quote.advance_rate)}% of the amount agreed with your vendor, paid out on the release date whether or not the event has happened yet. The fees above are not part of this split.`,
          },
          {
            label: 'Of which — held until you confirm',
            amount: quote.balance_amount,
            muted: true,
            hint: 'Sinnapi keeps this until you confirm the service was delivered, then releases it to your vendor.',
          },
        ]}
        footnote={
          <Stack direction="row" spacing={0.75} alignItems="center">
            <LockIcon sx={{ fontSize: 14 }} />
            <span>
              Your card or wallet details are entered on {railLabel}&rsquo;s own secure page and
              never reach Sinnapi.
            </span>
          </Stack>
        }
      />
    </Box>
  );
}

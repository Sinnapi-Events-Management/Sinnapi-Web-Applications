'use client';
import { Stack, Typography } from '@mui/material';
import type { FxQuoteView } from '../FxConfirmationDialog';
import { formatPercent, relativeAge } from '../fxFormat';

export type FxRateLinesProps = {
  quote: FxQuoteView;
  formatMoney: (amount: number, currency: string) => string;
};

/**
 * The working behind the charge: market rate, our margin, the rate that
 * results, and how old the rate is.
 *
 * The margin is a named line rather than something blended into the rate, so
 * a payer who checks our rate against a search result can see exactly where
 * the difference went. The age is always stated, including when it is older
 * than we would like — a rate with no timestamp is a claim, not a disclosure.
 */
export function FxRateLines({ quote, formatMoney }: FxRateLinesProps) {
  const per = (rate: number) => `1 ${quote.currency} = ${formatMoney(rate, quote.baseCurrency)}`;

  return (
    <Stack spacing={1}>
      <RateLine label="Market rate" value={per(quote.midRate)} />
      <RateLine
        label={`Conversion fee (${formatPercent(quote.marginRate)})`}
        value={formatMoney(quote.marginAmount, quote.baseCurrency)}
      />
      <RateLine label="Your rate" value={per(quote.effectiveRate)} emphasis />
      <Typography variant="caption" color="text.secondary">
        Rate updated {relativeAge(quote.rateFetchedAt)}.
        {quote.rateStale
          ? ' Live rates are briefly unavailable, so this is the most recent rate on file.'
          : ''}
      </Typography>
    </Stack>
  );
}

function RateLine({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color={emphasis ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={emphasis ? 700 : 500}
        sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

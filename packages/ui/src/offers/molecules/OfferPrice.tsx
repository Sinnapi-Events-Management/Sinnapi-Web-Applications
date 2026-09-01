'use client';
import { Box, Stack, Typography } from '@mui/material';
import { formatAmount } from '../../molecules/money';
import { offerSavingPercent } from '../schema/offerPricing';

export type OfferPriceProps = {
  /** What the client pays once the offer is applied. */
  offeredTotal: number;
  /** What they would have paid without it. Equal to `offeredTotal` when none applies. */
  listTotal: number;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  /** Right-aligns the block, for a card whose price sits in a trailing column. */
  align?: 'left' | 'right';
};

const SIZES = {
  small: { price: 'subtitle1', list: 'caption' },
  medium: { price: 'h6', list: 'body2' },
  large: { price: 'h4', list: 'body1' },
} as const;

/**
 * A price with its discount shown, or a price.
 *
 * The struck-through list price is the entire mechanism by which a saving
 * becomes credible, and it is also the easiest thing on this platform to make
 * dishonest. Two rules hold it straight:
 *
 *   1. It renders ONLY when the two figures actually differ. A card that
 *      strikes through a number equal to the one beside it is inventing a
 *      discount, and one such card costs more trust than ten real ones earn.
 *   2. Both numbers are totals of the same shape — tax handled identically,
 *      same currency — because `applyOfferToTier` recomputes tax on the reduced
 *      net rather than carrying the old figure. Comparing a tax-inclusive total
 *      against a tax-exclusive one would overstate every saving on the site.
 *
 * The old price comes FIRST and small, the new price second and large. The
 * reverse order reads as a price rise on a phone, where the two wrap onto
 * separate lines.
 */
export function OfferPrice({
  offeredTotal,
  listTotal,
  currency = 'UGX',
  size = 'medium',
  align = 'left',
}: OfferPriceProps) {
  const discounted = listTotal > offeredTotal;
  const percent = discounted ? offerSavingPercent(listTotal - offeredTotal, listTotal) : null;
  const variants = SIZES[size];

  return (
    <Box sx={{ textAlign: align, minWidth: 0 }}>
      {discounted && (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="baseline"
          justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
          sx={{ flexWrap: 'wrap' }}
        >
          <Typography
            variant={variants.list}
            color="text.disabled"
            sx={{ textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatAmount(listTotal, currency)}
          </Typography>
          {percent != null && percent > 0 && (
            <Typography variant={variants.list} color="success.main" sx={{ fontWeight: 700 }}>
              −{percent}%
            </Typography>
          )}
        </Stack>
      )}

      <Typography
        variant={variants.price}
        sx={{
          fontWeight: 800,
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums',
          color: discounted ? 'success.main' : 'text.primary',
          // Long figures in a narrow card column must not push the layout wide.
          overflowWrap: 'anywhere',
        }}
      >
        {formatAmount(offeredTotal, currency)}
      </Typography>
    </Box>
  );
}

'use client';
import type { ReactNode } from 'react';
import { Box, Divider, Skeleton, Stack, Typography } from '@mui/material';

export type CheckoutSummaryPanelProps = {
  title?: string;
  /** The lines the total is built from. */
  children: ReactNode;
  totalLabel: string;
  /** Already formatted by the portal's own `formatMoney`; null while pricing. */
  totalAmount: string | null;
  /** Lines that split the total rather than add to it, shown beneath it. */
  split?: ReactNode;
  /** A trust note, a caveat — whatever belongs directly under the figure. */
  footer?: ReactNode;
  /** First load: skeletons instead of figures. */
  isLoading?: boolean;
  /** A re-price of figures already on screen: dims them in place. */
  isUpdating?: boolean;
};

/**
 * What the payer is about to pay, as one panel: the parts, the total, and
 * anything that splits it.
 *
 * The order is deliberate. Everything above the total is added to reach it;
 * everything below it describes the same money, never more of it. Putting the
 * advance/balance split under the figure is what stops it reading as a second
 * charge on top.
 *
 * Takes pre-formatted money, as the rest of the payments kit does, so the
 * headline figure and the lines beneath it cannot print the same currency two
 * different ways.
 */
export function CheckoutSummaryPanel({
  title = 'Summary',
  children,
  totalLabel,
  totalAmount,
  split,
  footer,
  isLoading,
  isUpdating,
}: CheckoutSummaryPanelProps) {
  return (
    <Stack spacing={2}>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ lineHeight: 1.4 }}>
        {title}
      </Typography>

      <Box
        aria-busy={isUpdating || undefined}
        sx={{ opacity: isUpdating ? 0.5 : 1, transition: 'opacity .15s' }}
      >
        <Stack spacing={2}>
          {isLoading ? (
            <Stack spacing={1}>
              <Skeleton height={24} />
              <Skeleton height={24} />
              <Skeleton height={24} />
            </Stack>
          ) : (
            children
          )}

          <Divider />

          <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              {totalLabel}
            </Typography>
            {isLoading || totalAmount == null ? (
              <Skeleton width={140} height={36} />
            ) : (
              <Typography
                variant="h5"
                component="p"
                fontWeight={800}
                aria-live="polite"
                sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
              >
                {totalAmount}
              </Typography>
            )}
          </Stack>

          {!isLoading && split}
        </Stack>
      </Box>

      {footer}
    </Stack>
  );
}

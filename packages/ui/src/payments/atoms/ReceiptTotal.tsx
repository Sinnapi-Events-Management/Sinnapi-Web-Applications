'use client';
import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

export type ReceiptTotalProps = {
  /** What the figure is — "Total paid", "Amount due", "Charged". */
  label: string;
  /** Already formatted by the caller's own money formatter. */
  amount: string;
  /** Optional line under the figure — what protects it, when it cleared. */
  caption?: ReactNode;
  /** `hero` for the one headline figure, `inline` inside a dense panel. */
  size?: 'hero' | 'inline';
};

/**
 * The single figure a payer looks for first.
 *
 * Takes an already-formatted string rather than a number and a currency: each
 * portal formats money through its own `formatMoney`, and a shared component
 * that reached for a formatter of its own is how the same amount ends up
 * reading `USh 500,000` in the header and `UGX 500,000` two rows below it.
 *
 * `fontVariantNumeric: tabular-nums` keeps digits on a fixed advance so an
 * amount that updates in place — a poll resolving, a currency switching —
 * does not shuffle its own width.
 */
export function ReceiptTotal({ label, amount, caption, size = 'hero' }: ReceiptTotalProps) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: '0.08em', lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Typography
        variant={size === 'hero' ? 'h4' : 'h6'}
        sx={{
          fontWeight: 700,
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums',
          // A long amount in a narrow rail wraps rather than pushing the
          // panel wider than the grid column it was given.
          overflowWrap: 'anywhere',
        }}
      >
        {amount}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Stack>
  );
}

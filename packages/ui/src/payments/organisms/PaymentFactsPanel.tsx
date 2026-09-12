'use client';
import type { ReactNode } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { InfoRow } from '../../molecules/InfoRow';

export type PaymentFact = {
  label: string;
  value: ReactNode;
  /** Monospace face — references, tracking ids. */
  mono?: boolean;
  /** Offers copy-to-clipboard, for anything a payer quotes to support. */
  copyValue?: string;
};

export type PaymentFactsPanelProps = {
  title?: string;
  facts: PaymentFact[];
  footer?: ReactNode;
};

/**
 * What is known about a payment that has no receipt to show yet.
 *
 * The pending, failed and cancelled states have no itemised total, so without
 * this the rail would be empty and those three screens would fall back to a
 * lone narrow column — the whitespace problem again, on three pages instead
 * of one. They do have facts worth surfacing: the amount attempted, the rail
 * it went out on, and the reference support will ask for, which is otherwise
 * buried in prose the payer has to select by hand.
 */
export function PaymentFactsPanel({
  title = 'Payment details',
  facts,
  footer,
}: PaymentFactsPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: { xs: 2.5, sm: 3 },
        bgcolor: (t) => alpha(t.palette.divider, 0.035),
      }}
    >
      <Stack spacing={1}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: '0.08em', lineHeight: 1.4 }}
        >
          {title}
        </Typography>
        <div>
          {facts.map((fact) => (
            <InfoRow
              key={fact.label}
              label={fact.label}
              value={fact.value}
              mono={fact.mono}
              copyValue={fact.copyValue}
            />
          ))}
        </div>
        {footer}
      </Stack>
    </Paper>
  );
}

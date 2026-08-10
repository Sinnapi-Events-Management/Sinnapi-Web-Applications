'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { formatAmount } from './money';

export type MoneyLine = {
  label: string;
  amount: number | string | null | undefined;
  /** Shown behind an info icon — used for what a fee is and why it applies. */
  hint?: string;
  /** Renders with a leading `+`, for components added on top of a base. */
  additive?: boolean;
  /** De-emphasised, for context lines that are not part of the sum. */
  muted?: boolean;
};

export type MoneyBreakdownProps = {
  lines: MoneyLine[];
  total?: { label: string; amount: number | string | null | undefined; hint?: string };
  currency?: string;
  /** Optional note under the total — e.g. what protects the money. */
  footnote?: ReactNode;
  dense?: boolean;
};

/**
 * An itemised cost breakdown ending in a total.
 *
 * Escrow charges commission and the processing fee *on top of* the agreed
 * amount, so the client pays more than the price they negotiated. Showing the
 * components rather than a single figure is what stops that reading as a
 * surprise — the total is never presented without its parts.
 */
export function MoneyBreakdown({
  lines,
  total,
  currency = 'UGX',
  footnote,
  dense,
}: MoneyBreakdownProps) {
  const gap = dense ? 0.75 : 1.25;

  return (
    <Stack spacing={gap}>
      {lines.map((line) => (
        <Stack
          key={line.label}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ opacity: line.muted ? 0.7 : 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {line.label}
            </Typography>
            {line.hint && (
              <Tooltip title={line.hint}>
                <InfoOutlinedIcon
                  sx={{ fontSize: 15, color: 'text.disabled', cursor: 'help' }}
                  aria-label={line.hint}
                />
              </Tooltip>
            )}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
            {line.additive && '+ '}
            {formatAmount(line.amount, currency)}
          </Typography>
        </Stack>
      ))}

      {total && (
        <>
          <Box
            sx={{
              height: 1,
              bgcolor: (t) => alpha(t.palette.divider, 0.9),
              mt: dense ? 0.25 : 0.75,
            }}
          />
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                {total.label}
              </Typography>
              {total.hint && (
                <Tooltip title={total.hint}>
                  <InfoOutlinedIcon
                    sx={{ fontSize: 15, color: 'text.disabled', cursor: 'help' }}
                    aria-label={total.hint}
                  />
                </Tooltip>
              )}
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Typography variant="h6" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
              {formatAmount(total.amount, currency)}
            </Typography>
          </Stack>
        </>
      )}

      {footnote && (
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          {footnote}
        </Typography>
      )}
    </Stack>
  );
}

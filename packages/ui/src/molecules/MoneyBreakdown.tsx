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
  /**
   * Lines below the total that split it rather than build it — e.g. how a
   * payment is scheduled once made. Kept separate from `lines` so nothing
   * under the total can ever read as another charge on top of it.
   */
  afterTotal?: MoneyLine[];
  currency?: string;
  /** Optional note under the total — e.g. what protects the money. */
  footnote?: ReactNode;
  dense?: boolean;
  /**
   * Lets long labels wrap onto a second line instead of truncating.
   *
   * The default single line suits a full-width dialog, where every label
   * fits. In a ~320px receipt rail it does not: "Agreed with your vendor"
   * and "Held until you confirm" both ellipsed to "Agreed with you…" and
   * "Held until you c…", which is the one place a payer is checking what each
   * charge actually is.
   */
  wrapLabels?: boolean;
  /**
   * Overrides how amounts are rendered. Defaults to `formatAmount`, which
   * prints the ISO code (`UGX 500,000`). The portals format through their own
   * `formatMoney`, which localises the symbol (`USh 500,000`) — pass it here
   * when this breakdown sits beside a figure formatted that way, or the same
   * money reads two different ways on one screen.
   */
  format?: (amount: number | string | null | undefined, currency: string) => string;
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
  afterTotal,
  currency = 'UGX',
  footnote,
  dense,
  wrapLabels,
  format = formatAmount,
}: MoneyBreakdownProps) {
  const gap = dense ? 0.75 : 1.25;

  return (
    <Stack spacing={gap}>
      {lines.map((line) => (
        <BreakdownRow
          key={line.label}
          line={line}
          currency={currency}
          format={format}
          wrapLabels={wrapLabels}
        />
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
              {format(total.amount, currency)}
            </Typography>
          </Stack>
        </>
      )}

      {afterTotal && afterTotal.length > 0 && (
        <Stack spacing={dense ? 0.5 : 0.75} sx={{ pt: 0.25 }}>
          {afterTotal.map((line) => (
            <BreakdownRow
              key={line.label}
              line={line}
              currency={currency}
              format={format}
              wrapLabels={wrapLabels}
            />
          ))}
        </Stack>
      )}

      {footnote && (
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          {footnote}
        </Typography>
      )}
    </Stack>
  );
}

/** One label-to-amount row. Shared by the build-up lines and the split below. */
function BreakdownRow({
  line,
  currency,
  format,
  wrapLabels,
}: {
  line: MoneyLine;
  currency: string;
  format: NonNullable<MoneyBreakdownProps['format']>;
  wrapLabels?: boolean;
}) {
  return (
    <Stack
      direction="row"
      alignItems={wrapLabels ? 'flex-start' : 'center'}
      spacing={1}
      sx={{ opacity: line.muted ? 0.7 : 1 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ minWidth: 0, flexShrink: wrapLabels ? 1 : 0 }}
      >
        <Typography variant="body2" color="text.secondary" noWrap={!wrapLabels}>
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
        {format(line.amount, currency)}
      </Typography>
    </Stack>
  );
}

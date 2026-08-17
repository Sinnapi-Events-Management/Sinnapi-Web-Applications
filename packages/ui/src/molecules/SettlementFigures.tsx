'use client';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatAmount } from './money';
import {
  settlementAmounts,
  type SettlementRequestShape,
  type SettlementViewer,
} from './settlement';

export type SettlementFiguresProps = {
  request: SettlementRequestShape;
  viewer: SettlementViewer;
};

/**
 * The money in a settlement, as all three parties see it.
 *
 * This is the component the whole flow exists to make honest. Whatever figure
 * is finally paid, the vendor, the client and the console read it here in the
 * same layout, with the same labels, at the same size — a reduction is never
 * shown to one side as a number and to another as a sentence, and the amount
 * withheld is never left to be worked out by subtraction.
 *
 * The agreed figure is the loud one. Before anyone has decided, the requested
 * amount takes that position, because until then it is the only figure on the
 * table and pretending otherwise would understate what is at stake.
 */
export function SettlementFigures({ request, viewer }: SettlementFiguresProps) {
  const { requested, approved, withheld, isReduced, isAgreed, currency } =
    settlementAmounts(request);

  const headlineAmount = approved ?? requested;
  const headlineLabel = !isAgreed
    ? approved == null
      ? 'Vendor is asking for'
      : 'Amount offered'
    : viewer === 'vendor'
      ? 'You are being paid'
      : viewer === 'client'
        ? 'Being paid to your vendor'
        : 'Payable to the vendor';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.divider, 0.9),
        bgcolor: (t) =>
          alpha(
            t.palette[isAgreed ? 'success' : 'secondary'].main,
            t.palette.mode === 'dark' ? 0.08 : 0.05,
          ),
      }}
    >
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
            {headlineLabel}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
            {formatAmount(headlineAmount, currency)}
          </Typography>
        </Stack>

        {/* Only drawn once a reduction exists. On a full approval there is one
            number and adding "withheld: 0" beside it invents a doubt. */}
        {isReduced && (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            <Row label="Vendor asked for" value={formatAmount(requested, currency)} />
            <Row
              label={viewer === 'client' ? 'Coming back to you' : 'Returned to the client'}
              value={formatAmount(withheld, currency)}
              emphasis
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="body2" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography
        variant="body2"
        fontWeight={emphasis ? 700 : 600}
        sx={{ whiteSpace: 'nowrap' }}
        color={emphasis ? 'warning.main' : undefined}
      >
        {value}
      </Typography>
    </Stack>
  );
}

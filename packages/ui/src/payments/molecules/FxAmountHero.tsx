'use client';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EastIcon from '@mui/icons-material/East';
import SouthIcon from '@mui/icons-material/South';

export type FxAmountHeroProps = {
  /** What is owed, formatted in the currency it is denominated in. */
  owed: string;
  /** What will actually be charged, formatted in the charge currency. */
  charged: string;
};

/**
 * The obligation and the charge, side by side at comparable weight.
 *
 * Neither currency is the small print: a payer who agreed to a shilling
 * figure needs to see it next to the dollar figure they are about to accept,
 * not above it in caption type. The charge carries the accent because it is
 * the figure the next button acts on. Side by side from `sm`, stacked on a
 * phone where two amounts in one row would wrap mid-number.
 */
export function FxAmountHero({ owed, charged }: FxAmountHeroProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
      }}
    >
      <AmountTile label="Amount due" amount={owed} />
      <Box sx={{ display: 'grid', placeItems: 'center', color: 'text.disabled' }} aria-hidden>
        <EastIcon sx={{ display: { xs: 'none', sm: 'block' } }} />
        <SouthIcon sx={{ display: { xs: 'block', sm: 'none' } }} />
      </Box>
      <AmountTile label="You will be charged" amount={charged} emphasis />
    </Box>
  );
}

function AmountTile({
  label,
  amount,
  emphasis,
}: {
  label: string;
  amount: string;
  emphasis?: boolean;
}) {
  return (
    <Stack
      spacing={0.25}
      sx={{
        p: 2,
        borderRadius: 3,
        minWidth: 0,
        border: '1px solid',
        borderColor: (t) =>
          emphasis ? alpha(t.palette.secondary.main, 0.5) : alpha(t.palette.text.primary, 0.12),
        bgcolor: (t) =>
          emphasis ? alpha(t.palette.secondary.main, 0.1) : alpha(t.palette.text.primary, 0.03),
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography
        variant={emphasis ? 'h5' : 'h6'}
        fontWeight={emphasis ? 800 : 700}
        sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', lineHeight: 1.2 }}
      >
        {amount}
      </Typography>
    </Stack>
  );
}

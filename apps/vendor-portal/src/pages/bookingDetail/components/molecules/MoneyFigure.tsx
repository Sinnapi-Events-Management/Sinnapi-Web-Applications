import { Box, Typography } from '@sinnapi/ui';

type Props = {
  label: string;
  value: string;
  /** Swatch colour — matches this figure's band in the split bar above it. */
  swatch: string;
  /** Greys the figure when it is zero, so the live number is the one that reads. */
  muted?: boolean;
};

/**
 * One figure in the money summary, keyed to its band in the split bar.
 *
 * A row on a phone (label left, amount right, like a receipt line) and a
 * stacked tile from `sm` up. Three tiles side by side at 360px would squeeze
 * "UGX 10,600,000" onto two lines; three receipt rows never do.
 */
export default function MoneyFigure({ label, value, swatch, muted }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', sm: 'column' },
        alignItems: { xs: 'center', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 0.5 },
        minWidth: 0,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: swatch, flexShrink: 0 }}
        />
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.95rem', sm: '1.125rem' },
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          pl: { sm: 2.25 },
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

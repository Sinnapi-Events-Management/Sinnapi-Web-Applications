import { Box, Stack, Typography, type AccentColor } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';

type Props = {
  label: string;
  value: number;
  accent: AccentColor;
};

/**
 * One figure in the month strip: a colour-matched swatch, the count, the noun.
 *
 * The swatch ties the number to the days on the grid tinted the same way, so
 * "4 unavailable" and the four hatched cells read as one statement rather than
 * two facts that happen to sit near each other.
 */
export default function AvailabilityStat({ label, value, accent }: Props) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        px: { xs: 1.25, sm: 2 },
        py: 1.25,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette[accent].main, t.palette.mode === 'dark' ? 0.16 : 0.08),
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: `${accent}.main`,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {label}
        </Typography>
      </Box>
    </Stack>
  );
}

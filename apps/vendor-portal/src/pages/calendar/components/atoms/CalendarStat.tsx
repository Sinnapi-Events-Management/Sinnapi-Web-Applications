import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import type { AccentColor } from '@sinnapi/ui';

type Props = {
  label: string;
  value: number;
  accent: AccentColor;
};

/**
 * One figure in the month strip: a colour-matched swatch, the count, the noun.
 *
 * The swatch is the point — it ties the number to the days on the grid tinted
 * the same way, so "6 blocked" and the six red cells read as one statement
 * rather than two facts that happen to sit near each other.
 */
export default function CalendarStat({ label, value, accent }: Props) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderRadius: 2,
        // On charcoal the tile is a neutral lift with a hairline; the coloured
        // dot carries the meaning. A 16% hue fill read as brown/maroon blocks.
        bgcolor: (t) =>
          t.palette.mode === 'dark'
            ? alpha(t.palette.text.primary, 0.04)
            : alpha(t.palette[accent].main, 0.08),
        border: (t) => (t.palette.mode === 'dark' ? `1px solid ${t.palette.divider}` : 'none'),
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

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { withAlpha, palette } from '@sinnapi/ui/tokens';

/**
 * One labelled fact in the event details card — a tinted icon tile beside an
 * overline label and its value. Reusable for every row (date, location, budget…)
 * so the card keeps a consistent rhythm.
 */
export default function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.main',
          bgcolor: withAlpha(palette.light.primary.main, 0.1),
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ mt: -0.25 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

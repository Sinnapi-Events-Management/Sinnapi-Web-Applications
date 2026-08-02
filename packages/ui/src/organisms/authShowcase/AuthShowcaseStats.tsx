'use client';
import { Box, Stack } from '../../atoms/Layout';
import { alpha } from '../../system';

/** Trust markers under the slide body, as small glass pills. */
export function AuthShowcaseStats({ stats }: { stats: string[] }) {
  return (
    <Stack direction="row" flexWrap="wrap" justifyContent="center" sx={{ gap: 1, mt: 2.5 }}>
      {stats.map((stat) => (
        <Stack
          key={stat}
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: (t) => alpha(t.palette.common.white, 0.12),
            border: (t) => `1px solid ${alpha(t.palette.common.white, 0.2)}`,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'secondary.main',
              flexShrink: 0,
            }}
          />
          <Box
            component="span"
            sx={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.2px', opacity: 0.92 }}
          >
            {stat}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

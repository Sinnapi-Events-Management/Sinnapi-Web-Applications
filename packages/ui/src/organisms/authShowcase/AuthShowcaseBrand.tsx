'use client';
import { Box, Stack } from '../../atoms/Layout';
import { alpha } from '../../system';
import { fonts } from '../../theme/tokens';
import type { AuthShowcaseBrand as Brand } from './types';

/** Logo, hairline divider, wordmark and optional context pill. */
export function AuthShowcaseBrand({ brand }: { brand: Brand }) {
  const mark = (
    <Stack direction="row" spacing={1.75} alignItems="center" justifyContent="center">
      <Box
        component="img"
        src={brand.logoSrc}
        alt={`${brand.name} logo`}
        sx={{ height: 44, width: 'auto', display: 'block' }}
      />
      <Box
        aria-hidden
        sx={{ width: '1px', height: 30, bgcolor: (t) => alpha(t.palette.common.white, 0.28) }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontFamily: fonts.heading }}>
        <Box component="span" sx={{ fontWeight: 600, fontSize: 26, letterSpacing: '0.3px' }}>
          {brand.name}
        </Box>
        {brand.tagline && (
          <Box
            component="span"
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              px: 1,
              py: 0.5,
              borderRadius: 999,
              color: 'primary.dark',
              bgcolor: 'secondary.light',
              boxShadow: (t) => `0 2px 8px ${alpha(t.palette.secondary.dark, 0.4)}`,
            }}
          >
            {brand.tagline}
          </Box>
        )}
      </Box>
    </Stack>
  );

  if (!brand.href) return mark;

  return (
    <Box
      component="a"
      href={brand.href}
      sx={{
        display: 'inline-flex',
        textDecoration: 'none',
        color: 'inherit',
        width: 'fit-content',
        mx: 'auto',
      }}
    >
      {mark}
    </Box>
  );
}

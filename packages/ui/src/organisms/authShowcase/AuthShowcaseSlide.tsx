'use client';
import { Box } from '../../atoms/Layout';
import { Typography } from '../../atoms/Typography';
import { alpha } from '../../system';
import { AuthShowcaseStats } from './AuthShowcaseStats';
import type { AuthShowcaseSlide as Slide } from './types';

/** Icon chip, headline, body and trust pills for a single value prop. */
export function AuthShowcaseSlide({ slide }: { slide: Slide }) {
  const Icon = slide.icon;

  return (
    <Box>
      {Icon && (
        <Box
          aria-hidden
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            mb: 2,
            borderRadius: 2.5,
            color: 'secondary.light',
            bgcolor: (t) => alpha(t.palette.common.white, 0.12),
            border: (t) => `1px solid ${alpha(t.palette.common.white, 0.22)}`,
            '& svg': { fontSize: 24 },
          }}
        >
          <Icon />
        </Box>
      )}

      <Typography
        variant="h1"
        sx={{
          fontSize: { md: '2.1rem', lg: '2.5rem' },
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
          mb: 1.5,
        }}
      >
        {slide.title}
      </Typography>

      <Typography
        sx={{
          fontSize: 16,
          lineHeight: 1.6,
          letterSpacing: '0.1px',
          opacity: 0.88,
          maxWidth: 380,
          mx: 'auto',
        }}
      >
        {slide.body}
      </Typography>

      {slide.stats && slide.stats.length > 0 && <AuthShowcaseStats stats={slide.stats} />}
    </Box>
  );
}

'use client';
import { useId, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export type CheckoutSectionProps = {
  /** Shown as a numbered badge; omit for an unnumbered section. */
  step?: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * One decision in a checkout, with its heading.
 *
 * Numbered because a checkout dialog asks for several separate agreements —
 * how the money is scheduled, how it is paid — and a payer who can see "2 of
 * 2" knows the scrolling has an end. The heading labels the region, so a
 * screen reader can jump between decisions the way a sighted payer scans.
 */
export function CheckoutSection({ step, title, description, children }: CheckoutSectionProps) {
  const headingId = useId();

  return (
    <Stack component="section" aria-labelledby={headingId} spacing={1.5}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        {step != null && (
          <Box
            aria-hidden
            sx={{
              flexShrink: 0,
              width: 26,
              height: 26,
              mt: '1px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'secondary.dark',
              bgcolor: (t) => alpha(t.palette.secondary.main, 0.16),
            }}
          >
            {step}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography id={headingId} variant="subtitle1" component="h3" fontWeight={700}>
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary" component="p">
              {description}
            </Typography>
          )}
        </Box>
      </Stack>
      {children}
    </Stack>
  );
}

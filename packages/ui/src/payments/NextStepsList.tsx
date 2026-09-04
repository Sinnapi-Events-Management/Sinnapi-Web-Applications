'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type NextStepsListProps = {
  title?: string;
  steps: ReactNode[];
};

/**
 * "What happens next", numbered.
 *
 * A payment confirmation is read once, at the moment of paying, and the
 * question it has to answer is not "what did I pay" — the receipt above it
 * covers that — but "and now what". Numbered rather than bulleted because
 * the steps happen in order and on dates.
 */
export function NextStepsList({ title = 'What happens next', steps }: NextStepsListProps) {
  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">{title}</Typography>
      <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {steps.map((step, i) => (
          <Stack component="li" key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              aria-hidden
              sx={{
                flex: 'none',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                bgcolor: 'action.selected',
                color: 'text.primary',
              }}
            >
              {i + 1}
            </Box>
            <Typography variant="body2" sx={{ pt: 0.25 }}>
              {step}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

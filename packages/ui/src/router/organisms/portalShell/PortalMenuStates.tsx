'use client';
import type { ReactNode } from 'react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';

/**
 * Loading placeholder shaped like the rows it stands in for, so the panel does
 * not resize the moment its data lands.
 */
export function PortalMenuSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={0.5} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ px: 1.5, py: 1.25 }}>
          <Skeleton variant="circular" width={36} height={36} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="45%" height={16} />
            <Skeleton variant="text" width="80%" height={14} />
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export type PortalMenuEmptyProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

/** The all-clear state. Deliberately warm rather than apologetic — nothing is wrong. */
export function PortalMenuEmpty({ icon, title, description }: PortalMenuEmptyProps) {
  return (
    <Stack spacing={1} alignItems="center" sx={{ px: 3, py: 4, textAlign: 'center' }}>
      <Box sx={{ color: 'text.disabled', display: 'flex', '& svg': { fontSize: 32 } }}>{icon}</Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
}

/**
 * A failed read says so. A panel that renders its empty state over an error
 * tells the user there is nothing waiting for them, which may be the opposite
 * of the truth.
 */
export function PortalMenuError({ message }: { message: string }) {
  return (
    <Stack spacing={0.5} sx={{ px: 3, py: 4, textAlign: 'center' }} role="alert">
      <Typography variant="subtitle2" color="error.main">
        Could not load
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  );
}

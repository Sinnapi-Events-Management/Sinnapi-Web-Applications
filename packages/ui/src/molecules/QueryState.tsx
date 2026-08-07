'use client';
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';

export type QueryStateProps = {
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
};

/** Wraps the common loading/error pattern for a TanStack Query-backed view. */
export function QueryState({ isLoading, error, children }: QueryStateProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Something went wrong.'}
      </Alert>
    );
  }
  return <>{children}</>;
}

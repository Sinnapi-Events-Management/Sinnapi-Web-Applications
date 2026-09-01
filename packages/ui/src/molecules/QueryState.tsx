'use client';
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';

export type QueryStateProps = {
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
  /**
   * What to show while loading, instead of the centred spinner.
   *
   * The spinner is right for a whole page, where there is nothing yet to
   * suggest a shape. It is wrong inside a section card that already has a
   * heading and a known layout: a spinner there collapses the card to a
   * shrug and then snaps it open, where a skeleton of the rows about to
   * arrive keeps the card the size it will be. Optional, so every existing
   * caller keeps the spinner it was written against.
   */
  loadingFallback?: ReactNode;
};

/** Wraps the common loading/error pattern for a TanStack Query-backed view. */
export function QueryState({ isLoading, error, children, loadingFallback }: QueryStateProps) {
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
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

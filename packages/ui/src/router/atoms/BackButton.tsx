'use client';
import { Button, type SxProps } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGoBack } from '../hooks/useGoBack';

export type BackButtonProps = {
  /** Where to land when there is no in-app history to return to. */
  fallback: string;
  label?: string;
  sx?: SxProps<Theme>;
};

/**
 * Return-to-previous-screen control for detail views. Deliberately quiet — it
 * is an escape hatch, not one of the page's actions — and it keeps the label
 * generic because the destination depends on how the visitor arrived.
 *
 * Shared by the client and vendor portals so "back" behaves identically in
 * both; see `useGoBack` for how a deep-linked visit is handled.
 */
export function BackButton({ fallback, label = 'Back', sx }: BackButtonProps) {
  const goBack = useGoBack(fallback);

  return (
    <Button
      onClick={goBack}
      startIcon={<ArrowBackIcon />}
      size="small"
      color="inherit"
      variant="text"
      sx={[{ px: 1.5, color: 'text.secondary' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {label}
    </Button>
  );
}

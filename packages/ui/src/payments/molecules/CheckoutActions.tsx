'use client';
import type { ReactNode } from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';

export type CheckoutActionsProps = {
  onCancel: () => void;
  cancelLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** Swaps the icon for a spinner. The label should say what is happening. */
  isBusy?: boolean;
  primaryIcon?: ReactNode;
};

/**
 * The cancel / continue pair at the foot of every checkout step.
 *
 * On a phone the primary action goes full width and on top, where a thumb
 * lands, with cancel beneath it; from `sm` up they sit on one line, primary
 * on the right. DOM order stays cancel-then-primary in both, so tab order and
 * what a screen reader announces never depend on the breakpoint.
 *
 * Cancel is never disabled. A checkout call can take as long as its timeout,
 * and nobody should be trapped in a modal for that long — the server's
 * in-flight guard and idempotency key already assume an attempt can be
 * walked away from.
 */
export function CheckoutActions({
  onCancel,
  cancelLabel = 'Cancel',
  primaryLabel,
  onPrimary,
  primaryDisabled,
  isBusy,
  primaryIcon,
}: CheckoutActionsProps) {
  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      justifyContent="flex-end"
      spacing={1}
      sx={{ width: '100%' }}
    >
      <Button onClick={onCancel} color="inherit" sx={{ color: 'text.secondary' }}>
        {cancelLabel}
      </Button>
      <Button
        variant="contained"
        size="large"
        onClick={onPrimary}
        disabled={primaryDisabled || isBusy}
        startIcon={isBusy ? <CircularProgress size={18} color="inherit" /> : primaryIcon}
        sx={{ minWidth: { sm: 200 }, fontVariantNumeric: 'tabular-nums' }}
      >
        {primaryLabel}
      </Button>
    </Stack>
  );
}

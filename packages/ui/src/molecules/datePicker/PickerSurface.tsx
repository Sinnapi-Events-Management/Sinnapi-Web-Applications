'use client';
/**
 * The container the calendar (or time list) drops into.
 *
 * Two presentations, one API: anchored to the field on desktop, a centred
 * dialog on phones. `usePickerPopover` decides which; this component only
 * renders it, so the fields never branch on viewport themselves.
 */
import type { ReactNode } from 'react';
import { Dialog, Paper, Popover } from '@mui/material';
import type { PickerPopover } from './hooks/usePickerPopover';

export type PickerSurfaceProps = {
  popover: PickerPopover;
  /** Announced as the dialog's name, e.g. "Choose event date". */
  ariaLabel: string;
  children: ReactNode;
};

export function PickerSurface({ popover, ariaLabel, children }: PickerSurfaceProps) {
  const { open, anchorEl, fullScreen, closePicker } = popover;

  if (fullScreen) {
    return (
      <Dialog
        open={open}
        onClose={closePicker}
        aria-label={ariaLabel}
        PaperProps={{ sx: { borderRadius: 3, m: 2, maxWidth: 'none', width: 'auto' } }}
      >
        {children}
      </Dialog>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={closePicker}
      aria-label={ariaLabel}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      // `mt` keeps the panel clear of the field's outline rather than sitting on it.
      slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 3, boxShadow: 6 } } }}
    >
      <Paper elevation={0} sx={{ backgroundColor: 'transparent' }}>
        {children}
      </Paper>
    </Popover>
  );
}

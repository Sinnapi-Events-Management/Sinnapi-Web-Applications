'use client';
import type { ReactNode } from 'react';
import { Box, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type CheckoutDialogHeaderProps = {
  /** Labels the dialog: pass the same id as the Dialog's `aria-labelledby`. */
  titleId: string;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
};

/**
 * The checkout's title bar, with a close button that is always there.
 *
 * On a full-screen phone dialog there is no backdrop to tap, and the Cancel
 * button sits in a footer the payer may not think to look for — a visible ✕
 * in the corner is the exit people reach for first.
 */
export function CheckoutDialogHeader({
  titleId,
  title,
  subtitle,
  onClose,
}: CheckoutDialogHeaderProps) {
  return (
    <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} variant="h5" component="h2" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Close" edge="end" sx={{ mt: -0.5 }}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
  );
}

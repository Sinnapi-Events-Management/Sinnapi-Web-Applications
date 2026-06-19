'use client';
import { type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  /** Body text or arbitrary content. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use the error palette for the confirm button (destructive actions). */
  destructive?: boolean;
  /** Shows a spinner and disables buttons while an async action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation modal for destructive or important actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} color="inherit" variant="text">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          color={destructive ? 'error' : 'primary'}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

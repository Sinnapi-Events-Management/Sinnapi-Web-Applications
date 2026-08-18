'use client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { ControlledPasswordField } from '../../forms/ControlledPasswordField';
import { IconBadge } from '../../molecules/IconBadge';
import { PasswordStrength } from '../../molecules/PasswordStrength';
import { passwordHint } from '../schema/changePassword';
import { useChangePasswordForm } from '../hooks/useChangePasswordForm';
import type { ChangePasswordHandler } from '../types';

export type ChangePasswordDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: ChangePasswordHandler;
  /** The portal's own `PASSWORD_MIN_LENGTH`, so the rule matches its auth screens. */
  minLength: number;
  /** Fired after a successful write, before the dialog closes — drives the toast. */
  onChanged?: () => void;
};

/**
 * Change-password dialog: prove the current password, choose a new one.
 *
 * Purely structural — every piece of state, the validation and the write belong
 * to `useChangePasswordForm`. The two halves are separated by a rule because
 * they answer different questions ("is this you" then "what should it become"),
 * and running them together as three identical boxes is how people paste the
 * old password into the new field.
 */
export function ChangePasswordDialog({
  open,
  onClose,
  onSubmit,
  minLength,
  onChanged,
}: ChangePasswordDialogProps) {
  const { control, error, submitting, submit, clear, newPassword } = useChangePasswordForm({
    minLength,
    onSubmit,
    onSuccess: () => {
      onChanged?.();
      onClose();
    },
  });

  // Dismissing must not leave a typed password sitting in the form for whoever
  // opens the dialog next — including the current one, in plain state.
  function dismiss() {
    if (submitting) return;
    clear();
    onClose();
  }

  return (
    <Dialog open={open} onClose={dismiss} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBadge accent="secondary">
            <LockResetIcon />
          </IconBadge>
          <Stack>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Change password
            </Typography>
            <Typography variant="caption" color="text.secondary">
              You will stay signed in on this device.
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack
          component="form"
          id="change-password-form"
          spacing={2.5}
          onSubmit={submit}
          noValidate
        >
          {error && <Alert severity="error">{error}</Alert>}

          <ControlledPasswordField
            name="currentPassword"
            control={control}
            label="Current password"
            autoComplete="current-password"
            autoFocus
          />

          <Divider />

          <Stack spacing={1.5}>
            <ControlledPasswordField
              name="password"
              control={control}
              label="New password"
              autoComplete="new-password"
              helperText={passwordHint(minLength)}
            />
            <PasswordStrength value={newPassword ?? ''} minLength={minLength} />
          </Stack>

          <ControlledPasswordField
            name="confirm"
            control={control}
            label="Confirm new password"
            autoComplete="new-password"
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={dismiss} disabled={submitting} color="inherit" variant="text">
          Cancel
        </Button>
        <Button
          type="submit"
          form="change-password-form"
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Saving…' : 'Update password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

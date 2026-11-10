'use client';
import { useState } from 'react';
import { z } from 'zod';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ControlledPasswordField } from '../../forms/ControlledPasswordField';
import { useZodForm } from '../../forms/useZodForm';
import { IconBadge } from '../../molecules/IconBadge';
import { errorMessage } from '../hooks/useAsyncAction';
import type { ConfirmPasswordHandler } from '../types';

const schema = z.object({ password: z.string().min(1, 'Enter your password') });

export type ConfirmPasswordDialogProps = {
  open: boolean;
  /** What the confirmation unlocks, in the person's terms: "change your bank account". */
  purpose: string;
  onConfirm: ConfirmPasswordHandler;
  /** Fired once the server has accepted the password; the caller retries its action. */
  onConfirmed: () => void;
  onClose: () => void;
};

/**
 * "Is this really you?" — the step-up prompt in front of the few actions that
 * could cost someone money or their account.
 *
 * Sessions now last until 60 days of disuse, so holding the phone is usually
 * enough to be signed in. This is what keeps holding the phone from being enough
 * to redirect a vendor's payouts: one password, once per 15 minutes, only on
 * those actions. The check itself happens on the server and is bound to the
 * session, so dismissing or bypassing this dialog unlocks nothing.
 */
export function ConfirmPasswordDialog({
  open,
  purpose,
  onConfirm,
  onConfirmed,
  onClose,
}: ConfirmPasswordDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useZodForm(schema, { defaultValues: { password: '' } });

  const submit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await onConfirm(password);
      reset({ password: '' });
      onConfirmed();
    } catch (cause) {
      setError(errorMessage(cause));
      reset({ password: '' });
    }
  });

  // Never leave a typed password in form state for the next opening.
  function dismiss() {
    if (isSubmitting) return;
    reset({ password: '' });
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={dismiss} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBadge accent="secondary">
            <LockIcon />
          </IconBadge>
          <Stack>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Confirm it&apos;s you
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enter your password to {purpose}.
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack component="form" id="confirm-password-form" spacing={2} onSubmit={submit} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          <ControlledPasswordField
            name="password"
            control={control}
            label="Password"
            autoComplete="current-password"
            autoFocus
          />
          <Typography variant="caption" color="text.secondary">
            We ask for this before changes that affect your money or account. You won&apos;t be
            asked again for the next 15 minutes.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={dismiss} disabled={isSubmitting} color="inherit" variant="text">
          Cancel
        </Button>
        <Button
          type="submit"
          form="confirm-password-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Checking…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

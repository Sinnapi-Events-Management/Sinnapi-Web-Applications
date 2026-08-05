import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledPasswordField } from '@sinnapi/ui/forms';
import { PASSWORD_HINT } from '@/components/auth/schema';
import { useResetPasswordForm } from '../../hooks/useResetPasswordForm';

/**
 * New-password fields plus the write. Rendered only once the recovery session
 * is confirmed, so every failure it can show is about the password itself.
 */
export default function ResetPasswordForm() {
  const { control, error, submitting, submit } = useResetPasswordForm();

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledPasswordField
        name="password"
        control={control}
        label="New password"
        autoComplete="new-password"
        autoFocus
        helperText={PASSWORD_HINT}
      />
      <ControlledPasswordField
        name="confirm"
        control={control}
        label="Confirm new password"
        autoComplete="new-password"
      />
      <Button type="submit" variant="contained" size="large" disabled={submitting}>
        {submitting ? 'Saving…' : 'Set password'}
      </Button>
    </Stack>
  );
}

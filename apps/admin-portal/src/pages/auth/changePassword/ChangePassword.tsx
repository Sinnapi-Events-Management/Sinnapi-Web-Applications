import { useState } from 'react';
import { Stack, TextField, Button, Alert, IconButton, InputAdornment } from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AuthLayout from '@/components/auth/AuthLayout';
import { useChangePassword } from './hooks/useChangePassword';

/**
 * Forced password change for accounts provisioned with a one-time password.
 * `ProtectedRoute` redirects here and holds the user until the flag clears, so
 * there is deliberately no "skip" or back action.
 */
export default function ChangePassword() {
  const { error, submitting, submit, minLength } = useChangePassword();
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    submit(String(form.get('password')), String(form.get('confirm')));
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="For your security, set your own password before continuing."
    >
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="New password"
          autoComplete="new-password"
          required
          autoFocus
          helperText={`At least ${minLength} characters.`}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? (
                    <VisibilityOff fontSize="small" />
                  ) : (
                    <Visibility fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          name="confirm"
          type={showPassword ? 'text' : 'password'}
          label="Confirm new password"
          autoComplete="new-password"
          required
        />

        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Saving…' : 'Set password & continue'}
        </Button>
      </Stack>
    </AuthLayout>
  );
}

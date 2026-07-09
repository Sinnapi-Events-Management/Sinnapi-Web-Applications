import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Stack,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Link,
  CircularProgress,
} from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AuthLayout from '@/components/auth/AuthLayout';
import { useResetPassword } from './hooks/useResetPassword';

export default function ResetPassword() {
  const { ready, error, submitting, submit } = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    const confirm = String(form.get('confirm'));
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    submit(password);
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {mismatch && <Alert severity="warning">Passwords don't match.</Alert>}

        {!ready && !error ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          ready && (
            <>
              <TextField
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="New Password"
                autoComplete="new-password"
                required
                autoFocus
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
                label="Confirm New Password"
                autoComplete="new-password"
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Update password'}
              </Button>
            </>
          )
        )}

        <Link
          component={RouterLink}
          to="/sign-in"
          variant="body2"
          sx={{ alignSelf: 'center', fontWeight: 600, color: 'primary.main' }}
        >
          Back to sign in
        </Link>
      </Stack>
    </AuthLayout>
  );
}

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
  const { ready, error, submitting, submit, minLength } = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    submit(String(form.get('password')), String(form.get('confirm')));
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}

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
                {submitting ? 'Saving…' : 'Set password'}
              </Button>
            </>
          )
        )}

        {error && (
          <Link component={RouterLink} to="/sign-in" variant="body2" sx={{ textAlign: 'center' }}>
            Back to sign in
          </Link>
        )}
      </Stack>
    </AuthLayout>
  );
}

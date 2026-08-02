import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, TextField, Button, Alert, IconButton, InputAdornment, Link } from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { signInToPortal } from '@/auth/portalAccess';
import { safeReturnTo } from '@/auth/returnTo';

/**
 * Admin sign-in only — staff accounts are provisioned by `create-staff`, and
 * there is no public sign-up.
 *
 * Submits to the `portal-sign-in` endpoint rather than calling
 * `supabase.auth.signInWithPassword` directly. The direct call let ANY valid
 * Sinnapi credential mint a token here — a client's session was refused the
 * console by `AdminGate`, but only after the browser already held a working
 * project-wide token. It also echoed Supabase's own error text, which
 * distinguishes an unknown email from a wrong password, turning the console's
 * front door into an account-enumeration oracle. Now every refusal is one
 * message and the token is never issued in the first place.
 */
export default function SignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const signInError = await signInToPortal(
      String(form.get('email') ?? '')
        .trim()
        .toLowerCase(),
      String(form.get('password') ?? ''),
    );
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate(safeReturnTo(params.get('returnTo'), '/dashboard'), { replace: true });
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        name="email"
        type="email"
        label="Email Address"
        autoComplete="email"
        required
        autoFocus
      />

      <Stack spacing={0.75}>
        <TextField
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Password"
          autoComplete="current-password"
          required
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
        <Link
          component={RouterLink}
          to="/forgot-password"
          variant="body2"
          sx={{ alignSelf: 'flex-end', fontWeight: 600, color: 'secondary.dark' }}
        >
          Forgot password?
        </Link>
      </Stack>

      <Button type="submit" variant="contained" color="secondary" size="large" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
    </Stack>
  );
}

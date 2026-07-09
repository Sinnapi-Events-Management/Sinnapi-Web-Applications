import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, TextField, Button, Alert, IconButton, InputAdornment, Link } from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { supabase } from '@/lib/supabase';

// Admin sign-in only — accounts are provisioned in the DB (no public sign-up).
export default function SignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(decodeURIComponent(returnTo), { replace: true });
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
          sx={{ alignSelf: 'flex-end', fontWeight: 600, color: 'primary.main' }}
        >
          Forgot password?
        </Link>
      </Stack>

      <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
    </Stack>
  );
}

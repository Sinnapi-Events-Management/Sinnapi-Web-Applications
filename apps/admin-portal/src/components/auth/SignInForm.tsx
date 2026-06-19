import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Typography } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

// Admin sign-in only — accounts are provisioned in the DB (no public sign-up).
export default function SignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <TextField name="email" type="email" label="Email" autoComplete="email" required />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" variant="contained" size="large" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <Typography variant="caption" color="text.secondary">
        Admin access is granted by a Super Admin. Contact your administrator if you can't sign in.
      </Typography>
    </Stack>
  );
}

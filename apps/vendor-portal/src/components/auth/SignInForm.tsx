import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Typography } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

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
      <Typography variant="body2" color="text.secondary">
        New here? <RouterLink to="/sign-up">Create an account</RouterLink>
      </Typography>
    </Stack>
  );
}

import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Typography, MenuItem } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

export default function SignUpForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'event_planner' ? 'event_planner' : 'client';
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get('email')),
      password: String(form.get('password')),
      options: {
        data: { full_name: String(form.get('full_name')), role: String(form.get('role')) },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setDone(true);
  }

  if (done)
    return (
      <Alert severity="success">Check your email to confirm your account, then sign in.</Alert>
    );

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField name="full_name" label="Full name" autoComplete="name" required />
      <TextField name="email" type="email" label="Email" autoComplete="email" required />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        helperText="At least 8 characters"
      />
      <TextField name="role" label="I am a…" select defaultValue={initialRole}>
        <MenuItem value="client">Client (planning my own event)</MenuItem>
        <MenuItem value="event_planner">Event Planner (managing events professionally)</MenuItem>
      </TextField>
      <Button type="submit" variant="contained" size="large" disabled={loading}>
        {loading ? 'Creating…' : 'Create account'}
      </Button>
      <Typography variant="body2" color="text.secondary">
        Already have an account? <RouterLink to="/sign-in">Sign in</RouterLink>
      </Typography>
    </Stack>
  );
}

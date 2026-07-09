import { Link as RouterLink } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Link } from '@sinnapi/ui';
import AuthLayout from '@/components/auth/AuthLayout';
import { useForgotPassword } from './hooks/useForgotPassword';

export default function ForgotPassword() {
  const { requestReset, error, loading, sent } = useForgotPassword();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    requestReset(String(form.get('email')));
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {sent ? (
          <Alert severity="success">
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </Alert>
        ) : (
          <>
            <TextField
              name="email"
              type="email"
              label="Email Address"
              autoComplete="email"
              required
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
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

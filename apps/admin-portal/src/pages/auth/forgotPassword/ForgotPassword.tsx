import { Link as RouterLink } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Link } from '@sinnapi/ui';
import { CaptchaField } from '@sinnapi/ui/forms';
import AuthLayout from '@/components/auth/AuthLayout';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { useForgotPassword } from './hooks/useForgotPassword';

export default function ForgotPassword() {
  const { requestReset, error, loading, sent, captcha, canSubmit } = useForgotPassword();

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
            <CaptchaField
              {...captcha.fieldProps}
              siteKey={TURNSTILE_SITE_KEY}
              action="admin-forgot-password"
            />
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              disabled={!canSubmit}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}
        <Link
          component={RouterLink}
          to="/sign-in"
          variant="body2"
          sx={{ alignSelf: 'center', fontWeight: 600, color: 'secondary.dark' }}
        >
          Back to sign in
        </Link>
      </Stack>
    </AuthLayout>
  );
}

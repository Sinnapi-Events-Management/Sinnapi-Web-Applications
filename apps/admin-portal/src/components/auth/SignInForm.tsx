import { Link as RouterLink } from 'react-router-dom';
import { Stack, TextField, Button, Alert, Link } from '@sinnapi/ui';
import { CaptchaField } from '@sinnapi/ui/forms';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import PasswordField from './PasswordField';
import { useSignInForm } from './hooks/useSignInForm';

/**
 * Admin sign-in only — staff accounts are provisioned by `create-staff`, and
 * there is no public sign-up.
 *
 * Structure only: `useSignInForm` owns the submit, the error and the CAPTCHA,
 * and documents why this form goes through `portal-sign-in` rather than calling
 * `supabase.auth.signInWithPassword` directly.
 */
export default function SignInForm() {
  const { error, loading, submit, captcha, canSubmit } = useSignInForm();

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
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
        <PasswordField />
        <Link
          component={RouterLink}
          to="/forgot-password"
          variant="body2"
          sx={{ alignSelf: 'flex-end', fontWeight: 600, color: 'secondary.dark' }}
        >
          Forgot password?
        </Link>
      </Stack>

      <CaptchaField {...captcha.fieldProps} siteKey={TURNSTILE_SITE_KEY} action="admin-sign-in" />

      <Button
        type="submit"
        variant="contained"
        color="secondary"
        size="large"
        disabled={!canSubmit}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
    </Stack>
  );
}

import { Stack, Button, Alert, Link, Typography } from '@sinnapi/ui';
import { ControlledField, ControlledPasswordField, CaptchaField } from '@sinnapi/ui/forms';
import { APP } from '@/lib/config';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { useSignInForm } from './hooks/useSignInForm';

export default function SignInForm() {
  const { control, error, loading, submit, captcha, canSubmit } = useSignInForm();

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField
        name="email"
        control={control}
        type="email"
        label="Email"
        autoComplete="email"
      />
      <ControlledPasswordField
        name="password"
        control={control}
        label="Password"
        autoComplete="current-password"
      />
      <CaptchaField {...captcha.fieldProps} siteKey={TURNSTILE_SITE_KEY} action="vendor-sign-in" />
      <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>

      {/*
        Not `AuthSwitchPrompt`: that renders a react-router link, and this
        destination is the public marketing site rather than a route in this SPA.

        There is deliberately no "create an account" here. The `vendor` role is
        granted only when an application is approved, so self-service sign-up
        could only ever produce an account this portal's own gate then refuses —
        the dead end this replaces. Approved applicants receive credentials by
        email.
      */}
      <Typography variant="body1" color="text.secondary">
        Not on Sinnapi yet?{' '}
        <Link href={`${APP.publicUrl}/apply`} underline="none" sx={{ fontWeight: 600 }}>
          Apply to become a vendor
        </Link>
      </Typography>
    </Stack>
  );
}

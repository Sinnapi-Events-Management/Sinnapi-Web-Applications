import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, ControlledPasswordField, CaptchaField } from '@sinnapi/ui/forms';
import { AuthSwitchPrompt } from '@sinnapi/ui/router';
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
      <CaptchaField {...captcha.fieldProps} siteKey={TURNSTILE_SITE_KEY} action="client-sign-in" />
      <Button
        type="submit"
        variant="contained"
        size="large"
        color="secondary"
        disabled={!canSubmit}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <AuthSwitchPrompt question="New here?" actionLabel="Create an account" to="/sign-up" />
    </Stack>
  );
}

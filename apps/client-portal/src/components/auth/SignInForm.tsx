import { Stack, Button, Alert, Typography } from '@sinnapi/ui';
import {
  ControlledCheckbox,
  ControlledField,
  ControlledPasswordField,
  CaptchaField,
} from '@sinnapi/ui/forms';
import { AppLink, AuthSwitchPrompt } from '@sinnapi/ui/router';
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
      <Stack spacing={0.75}>
        <ControlledPasswordField
          name="password"
          control={control}
          label="Password"
          autoComplete="current-password"
        />
        <AppLink
          to="/forgot-password"
          variant="body2"
          sx={{ alignSelf: 'flex-end', fontWeight: 600 }}
        >
          Forgot password?
        </AppLink>
      </Stack>
      <ControlledCheckbox
        name="remember"
        control={control}
        label={
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Keep me signed in on this device
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Untick on a shared phone or computer.
            </Typography>
          </Stack>
        }
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

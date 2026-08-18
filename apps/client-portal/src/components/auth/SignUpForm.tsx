import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, ControlledPasswordField, CaptchaField } from '@sinnapi/ui/forms';
import { AuthSwitchPrompt } from '@sinnapi/ui/router';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { PASSWORD_HINT, ROLE_OPTIONS } from './schema';
import SignUpConsent from './molecules/SignUpConsent';
import type { useSignUpForm } from './hooks/useSignUpForm';

/**
 * The registration fields only.
 *
 * Unlike `SignInForm` this does not own its hook: signing up has a second
 * screen (`CheckInboxPanel`), and the page needs the same state to pick the
 * heading above whichever one is showing. So `SignUp` holds the state and hands
 * this component the parts it renders.
 */
type Props = Pick<
  ReturnType<typeof useSignUpForm>,
  'control' | 'error' | 'loading' | 'submit' | 'captcha' | 'canSubmit'
>;

export default function SignUpForm({ control, error, loading, submit, captcha, canSubmit }: Props) {
  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField
        name="fullName"
        control={control}
        label="Full name"
        autoComplete="name"
        autoFocus
      />
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
        autoComplete="new-password"
        helperText={PASSWORD_HINT}
      />
      <ControlledField name="role" control={control} label="I am a…" options={ROLE_OPTIONS} />
      {/* Above the CAPTCHA rather than below it: the consents are decisions the
          person makes, the human check is a formality they clear on the way out,
          and burying a required acceptance under a widget is how it gets missed. */}
      <SignUpConsent control={control} disabled={loading} />
      <CaptchaField {...captcha.fieldProps} siteKey={TURNSTILE_SITE_KEY} action="client-sign-up" />
      <Button
        type="submit"
        variant="contained"
        size="large"
        color="secondary"
        disabled={!canSubmit}
      >
        {loading ? 'Creating…' : 'Create account'}
      </Button>
      <AuthSwitchPrompt question="Already have an account?" actionLabel="Sign in" to="/sign-in" />
    </Stack>
  );
}

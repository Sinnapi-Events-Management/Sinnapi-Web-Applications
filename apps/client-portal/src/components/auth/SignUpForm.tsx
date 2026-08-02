import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, ControlledPasswordField } from '@sinnapi/ui/forms';
import { AuthSwitchPrompt } from '@sinnapi/ui/router';
import { PASSWORD_HINT, ROLE_OPTIONS } from './schema';
import { useSignUpForm } from './hooks/useSignUpForm';

export default function SignUpForm() {
  const { control, error, loading, submitted, submit } = useSignUpForm();

  if (submitted)
    return (
      <Alert severity="success">Check your email to confirm your account, then sign in.</Alert>
    );

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
      <Button type="submit" variant="contained" size="large" disabled={loading}>
        {loading ? 'Creating…' : 'Create account'}
      </Button>
      <AuthSwitchPrompt question="Already have an account?" actionLabel="Sign in" to="/sign-in" />
    </Stack>
  );
}

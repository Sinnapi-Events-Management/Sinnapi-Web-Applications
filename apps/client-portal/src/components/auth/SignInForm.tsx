import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, ControlledPasswordField } from '@sinnapi/ui/forms';
import { AuthSwitchPrompt } from '@sinnapi/ui/router';
import { useSignInForm } from './hooks/useSignInForm';

export default function SignInForm() {
  const { control, error, loading, submit } = useSignInForm();

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
      <Button type="submit" variant="contained" size="large" color="secondary" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <AuthSwitchPrompt question="New here?" actionLabel="Create an account" to="/sign-up" />
    </Stack>
  );
}

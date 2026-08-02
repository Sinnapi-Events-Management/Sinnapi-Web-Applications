import { Stack, Alert, CircularProgress } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import AuthLayout from '@/components/auth/AuthLayout';
import { useResetPassword } from './hooks/useResetPassword';
import ResetPasswordForm from './components/organisms/ResetPasswordForm';

/**
 * Reset-link landing page. It resolves the recovery session and then hands over
 * to the form — link failures are terminal and offer a way back to sign-in,
 * password failures are the form's to show.
 */
export default function ResetPassword() {
  const { ready, error } = useResetPassword();

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <Stack spacing={2.5}>
        {error && (
          <>
            <Alert severity="error">{error}</Alert>
            <AppLink to="/sign-in" variant="body2" sx={{ textAlign: 'center' }}>
              Back to sign in
            </AppLink>
          </>
        )}

        {!ready && !error && (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}

        {ready && <ResetPasswordForm />}
      </Stack>
    </AuthLayout>
  );
}

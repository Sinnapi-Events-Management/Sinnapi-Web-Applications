import { Stack } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import AuthLayout from '@/components/auth/AuthLayout';
import ForgotPasswordForm from './components/organisms/ForgotPasswordForm';

/**
 * Self-service password recovery. Public — someone who cannot sign in has no
 * session to prove anything with — so the form is CAPTCHA-gated and the
 * response never reveals whether the address has an account.
 */
export default function ForgotPassword() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <Stack spacing={2.5}>
        <ForgotPasswordForm />
        <AppLink to="/sign-in" variant="body2" sx={{ alignSelf: 'center', fontWeight: 600 }}>
          Back to sign in
        </AppLink>
      </Stack>
    </AuthLayout>
  );
}

import AuthLayout from '@/components/auth/AuthLayout';
import ChangePasswordForm from './components/organisms/ChangePasswordForm';

/**
 * Forced password change for vendor accounts provisioned with a one-time
 * password. `ProtectedRoute` redirects here and holds the vendor until the flag
 * clears, so there is deliberately no "skip" or back action.
 */
export default function ChangePassword() {
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="For your security, replace the temporary password we emailed you before continuing."
    >
      <ChangePasswordForm />
    </AuthLayout>
  );
}

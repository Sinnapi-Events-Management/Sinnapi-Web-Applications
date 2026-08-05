import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignUpForm from '@/components/auth/SignUpForm';
import CheckInboxPanel from '@/components/auth/CheckInboxPanel';
import { useSignUpForm } from '@/components/auth/hooks/useSignUpForm';
import { useSignUp } from './hooks/useSignUp';

/**
 * Two screens behind one route: the registration form, then the confirmation
 * notice it hands over to.
 *
 * They are one route rather than two because the second screen depends on state
 * the first produced (the address we sent to) — routing to a separate page would
 * mean either putting that address in the URL, where it does not belong, or
 * losing it on refresh and rendering a screen that can no longer resend.
 *
 * The heading lives here, not in either child, so whichever screen is showing
 * owns the page's only h1.
 */
export default function SignUp() {
  const { redirectToDashboard } = useSignUp();
  const { control, error, loading, sentTo, submit, startOver, captcha, canSubmit } =
    useSignUpForm();

  if (redirectToDashboard) return <Navigate to="/dashboard" replace />;

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox">
        <CheckInboxPanel email={sentTo} onUseDifferentEmail={startOver} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Plan your events with trusted, verified vendors."
    >
      <SignUpForm
        control={control}
        error={error}
        loading={loading}
        submit={submit}
        captcha={captcha}
        canSubmit={canSubmit}
      />
    </AuthLayout>
  );
}

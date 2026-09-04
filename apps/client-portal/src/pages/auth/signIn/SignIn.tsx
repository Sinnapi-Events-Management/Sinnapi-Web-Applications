import { Navigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignInForm from '@/components/auth/SignInForm';
import { safeReturnTo } from '@/auth/returnTo';
import { useSignIn } from './hooks/useSignIn';

/** Where an already-signed-in visitor lands when the URL names no `returnTo`. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * A signed-in visitor is sent on, and `returnTo` is honoured here as well as
 * in the form, because this is the redirect that actually fires after a
 * sign-in. `AuthProvider` admits a new session asynchronously (it asks the
 * server which portal the account belongs in), so the form's own
 * `navigate(returnTo)` runs while `session` is still null; `ProtectedRoute`
 * bounces straight back to `/sign-in?returnTo=…`, and it is this component,
 * a moment later when the session is admitted, that decides where the user
 * ends up. Sending them to the dashboard here threw the destination away —
 * a client whose session lapsed on Pesapal's page came back to the dashboard
 * instead of `/payments/return`, with the payment's ids gone from the URL.
 */
export default function SignIn() {
  const { redirectToDashboard } = useSignIn();
  const [params] = useSearchParams();
  if (redirectToDashboard) {
    return <Navigate to={safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION)} replace />;
  }
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Sinnapi account.">
      <SignInForm />
    </AuthLayout>
  );
}

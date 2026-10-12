import { Navigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignInForm from '@/components/auth/SignInForm';
import { safeReturnTo } from '@/auth/returnTo';
import { useSignIn } from './hooks/useSignIn';

/** Where an already-signed-in visitor lands when the URL names no `returnTo`. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * A signed-in visitor is sent on, and `returnTo` is honoured here as well as in
 * the form, because this is the redirect that actually fires after a sign-in.
 * `AuthProvider` admits a new session asynchronously — it asks the server
 * whether the account belongs in this portal — so the form's own
 * `navigate(returnTo)` runs while `session` is still null; `ProtectedRoute`
 * bounces straight back to `/sign-in?returnTo=…`, and it is this component, a
 * moment later when the session is admitted, that decides where the vendor ends
 * up. Sending them to the dashboard here threw the destination away, so every
 * deep link a notification email hands a signed-out vendor — a quotation, a
 * booking, a conversation — resolved to the dashboard instead.
 */
export default function SignIn() {
  const { redirect } = useSignIn();
  const [params] = useSearchParams();
  if (redirect) {
    return <Navigate to={safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION)} replace />;
  }
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Sinnapi account.">
      <SignInForm />
    </AuthLayout>
  );
}

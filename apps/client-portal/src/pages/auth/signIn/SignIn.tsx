import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignInForm from '@/components/auth/SignInForm';
import { useSignIn } from './hooks/useSignIn';

export default function SignIn() {
  const { redirectToDashboard } = useSignIn();
  if (redirectToDashboard) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Sinnapi account.">
      <SignInForm />
    </AuthLayout>
  );
}

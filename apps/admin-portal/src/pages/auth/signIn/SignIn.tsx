import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignInForm from '@/components/auth/SignInForm';
import { useSignIn } from './hooks/useSignIn';

export default function SignIn() {
  const { session, loading } = useSignIn();
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout title="Sign in" subtitle="Enter your details to access your dashboard.">
      <SignInForm />
    </AuthLayout>
  );
}

import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import SignUpForm from '@/components/auth/SignUpForm';
import { useSignUp } from './hooks/useSignUp';

export default function SignUp() {
  const { redirect } = useSignUp();
  if (redirect) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Plan your events with trusted, verified vendors."
    >
      <SignUpForm />
    </AuthLayout>
  );
}

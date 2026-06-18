import { Navigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import SignInForm from "@/components/auth/SignInForm";
import { useAuth } from "@/auth/AuthProvider";

export default function SignIn() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Sinnapi account.">
      <SignInForm />
    </AuthLayout>
  );
}

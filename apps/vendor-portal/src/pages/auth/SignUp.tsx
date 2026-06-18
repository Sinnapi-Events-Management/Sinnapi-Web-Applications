import { Navigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import SignUpForm from "@/components/auth/SignUpForm";
import { useAuth } from "@/auth/AuthProvider";

export default function SignUp() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout title="Create your account" subtitle="Plan your events with trusted, verified vendors.">
      <SignUpForm />
    </AuthLayout>
  );
}

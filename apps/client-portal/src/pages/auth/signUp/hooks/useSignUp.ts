import { useAuth } from '@/auth/AuthProvider';

export function useSignUp() {
  const { session, loading } = useAuth();
  const redirectToDashboard = !loading && !!session;

  return { redirectToDashboard };
}

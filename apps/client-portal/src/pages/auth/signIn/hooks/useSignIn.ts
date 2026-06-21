import { useAuth } from '@/auth/AuthProvider';

export function useSignIn() {
  const { session, loading } = useAuth();
  const redirectToDashboard = !loading && !!session;

  return { redirectToDashboard };
}

import { useAuth } from '@/auth/AuthProvider';

export function useSignIn() {
  const { session, loading } = useAuth();
  const redirect = !loading && session;

  return { redirect };
}

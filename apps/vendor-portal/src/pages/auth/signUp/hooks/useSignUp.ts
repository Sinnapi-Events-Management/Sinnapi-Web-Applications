import { useAuth } from '@/auth/AuthProvider';

export function useSignUp() {
  const { session, loading } = useAuth();
  const redirect = !loading && session;

  return { redirect };
}

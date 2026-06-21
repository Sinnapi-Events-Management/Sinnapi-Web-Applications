import { useAuth } from '@/auth/AuthProvider';

export function useSignIn() {
  const { session, loading } = useAuth();
  return { session, loading };
}

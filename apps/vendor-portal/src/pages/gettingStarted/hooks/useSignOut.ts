import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Sign out from inside the wizard. The modal covers the shell's account menu,
 * so this is the same action that menu runs, with a pending flag so a slow
 * sign-out cannot be clicked twice.
 */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const run = useCallback(async () => {
    setPending(true);
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } finally {
      setPending(false);
    }
  }, [navigate, signOut]);

  return { run, pending };
}

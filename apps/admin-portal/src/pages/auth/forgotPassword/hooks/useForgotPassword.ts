import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Sends a password-recovery email whose link returns to /reset-password.
export function useForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function requestReset(email: string) {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return { requestReset, error, loading, sent };
}

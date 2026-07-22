import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toProfileUpdate, type ProfileFormValues } from '../schema';

/**
 * Writes the signed-in admin's own name and phone.
 *
 * The write is a plain `profiles` update — RLS' `profiles_self_update` already
 * scopes it to `auth.uid()`, so no server function is involved. Neither email
 * nor status nor roles are touched: email is the account identity, and the other
 * two are owned by the Users page's admin flows.
 */
export function useProfileDetails(onSaved?: (message: string) => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = useCallback(
    async (values: ProfileFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBusy(false);
        setErr('Your session has expired. Sign in again to save changes.');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update(toProfileUpdate(values))
        .eq('id', user.id);

      setBusy(false);
      if (error) {
        setErr(error.message);
        return false;
      }

      // The shell's AppBar reads the same `['profile']` entry, so its name and
      // initial update in the same tick as the form.
      await qc.invalidateQueries({ queryKey: ['profile'] });
      onSaved?.('Your profile has been updated.');
      return true;
    },
    [qc, onSaved],
  );

  return { busy, err, clearError: useCallback(() => setErr(null), []), save };
}

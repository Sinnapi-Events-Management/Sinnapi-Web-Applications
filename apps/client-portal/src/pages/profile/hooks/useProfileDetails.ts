import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toProfileUpdate, type ProfileFormValues } from '../schema';

/**
 * Writes the signed-in client's own name, phone and billing currency.
 *
 * A plain `profiles` update — RLS' `profiles_self_update` already scopes it to
 * `auth.uid()`, so no server function is involved. Email is never touched: it is
 * the account identity.
 *
 * Returns a boolean rather than throwing so the form can decide whether to
 * re-baseline: a failed save must keep the user's edits and the dirty state, or
 * they lose what they typed.
 */
export function useProfileDetails(profileId: string | null, onSaved?: (message: string) => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (values: ProfileFormValues): Promise<boolean> => {
      if (!profileId) {
        setError('Your session has expired. Sign in again to save changes.');
        return false;
      }

      setBusy(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(toProfileUpdate(values))
        .eq('id', profileId);

      setBusy(false);
      if (updateError) {
        setError(updateError.message);
        return false;
      }

      // The shell's AppBar reads the same `['profile']` entry, so its name and
      // initial update in the same tick as the form.
      await qc.invalidateQueries({ queryKey: ['profile'] });
      onSaved?.('Your profile has been updated.');
      return true;
    },
    [onSaved, profileId, qc],
  );

  return { busy, error, clearError: useCallback(() => setError(null), []), save };
}

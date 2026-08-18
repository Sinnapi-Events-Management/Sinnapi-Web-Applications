import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toAccountUpdate, type AccountFormValues } from '../schema';

/**
 * Writes the vendor's own name and phone.
 *
 * A plain `profiles` update — RLS' `profiles_self_update` already scopes it to
 * `auth.uid()`, so no server function is involved. Nothing on the business record
 * is touched: a vendor's own name and their trading name are separate facts, and
 * conflating them is how a sole trader's legal name ends up on a public listing.
 *
 * The previous version of this write (on the Settings page) discarded the update's
 * error entirely and showed its success toast either way; a failed save now says so.
 */
export function useAccountDetails(profileId: string | null, onSaved?: (message: string) => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (values: AccountFormValues): Promise<boolean> => {
      if (!profileId) {
        setError('Your session has expired. Sign in again to save changes.');
        return false;
      }

      setBusy(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(toAccountUpdate(values))
        .eq('id', profileId);

      setBusy(false);
      if (updateError) {
        setError(updateError.message);
        return false;
      }

      await qc.invalidateQueries({ queryKey: ['profile'] });
      onSaved?.('Your account details have been updated.');
      return true;
    },
    [onSaved, profileId, qc],
  );

  return { busy, error, clearError: useCallback(() => setError(null), []), save };
}

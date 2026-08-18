import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toVendorProfileUpdate, type VendorProfileFormValues } from '../schema';
import { vendorProfileKey } from './useProfile';

/**
 * Writes the vendor's business listing columns.
 *
 * Returns a boolean rather than throwing so the form can decide whether to
 * re-baseline: a failed save must keep the vendor's edits and the dirty state, or
 * they lose a bio they may have spent ten minutes on.
 *
 * `['my-vendor']` is invalidated alongside the page's own read because
 * `VendorProvider` caches the business name, and the shell renders it.
 */
export function useVendorProfileDetails(vendorId: string, onSaved?: (message: string) => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (values: VendorProfileFormValues): Promise<boolean> => {
      setBusy(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('vendors')
        .update(toVendorProfileUpdate(values))
        .eq('id', vendorId);

      setBusy(false);
      if (updateError) {
        setError(updateError.message);
        return false;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: vendorProfileKey(vendorId) }),
        qc.invalidateQueries({ queryKey: ['my-vendor'] }),
      ]);
      onSaved?.('Your business profile has been updated.');
      return true;
    },
    [onSaved, qc, vendorId],
  );

  return { busy, error, clearError: useCallback(() => setError(null), []), save };
}

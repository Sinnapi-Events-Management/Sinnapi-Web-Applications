import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { onboardingKey } from './useOnboardingStatus';

/**
 * Writes a partial `vendors` row for the signed-in vendor.
 *
 * One mutation shared by every step rather than a write per step: each step owns
 * a different handful of columns, and the invalidation that has to follow — the
 * wizard's own read plus `['my-vendor']`, which backs the shell — is identical
 * for all of them.
 */
export function useVendorPatch(vendorId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from('vendors').update(patch).eq('id', vendorId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: onboardingKey(vendorId) }),
        qc.invalidateQueries({ queryKey: ['my-vendor'] }),
      ]);
    },
  });
}

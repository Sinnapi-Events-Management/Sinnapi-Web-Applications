import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Turns WhatsApp updates on or off for the signed-in person.
 *
 * Off is a timestamp (`whatsapp_opt_out_at`) rather than a boolean so Support
 * can see when it happened; the STOP reply on WhatsApp writes the same column.
 * A plain update — `profiles_self_update` scopes it to the caller.
 */
export function useWhatsAppPreference(
  profileId: string | null,
  onDone?: (message: string) => void,
) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!profileId) return;
      setBusy(true);
      setError(null);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ whatsapp_opt_out_at: on ? null : new Date().toISOString() })
        .eq('id', profileId);
      setBusy(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['profile'] });
      onDone?.(on ? 'WhatsApp updates are on.' : 'WhatsApp updates are off.');
    },
    [onDone, profileId, qc],
  );

  return { busy, error, setEnabled };
}

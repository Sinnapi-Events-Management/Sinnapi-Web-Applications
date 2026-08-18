import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { escrowErrorMessage } from '@/hooks/queries';

/**
 * The writes a client can make against their own escrow.
 *
 * Each one is a single RPC because each one is a single decision the server
 * has to authorise and record — consent, confirmation, dispute. The hook only
 * sequences them and turns a Postgres error into something readable.
 */
export function useEscrowActions(bookingId: string | undefined, escrowId: string | undefined) {
  const qc = useQueryClient();
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: string, args: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(fn, args);
      if (rpcError) throw rpcError;
      // Realtime will also fire, but invalidating here means the button stops
      // looking clickable the moment the write lands rather than a round trip
      // later — on a money action that gap reads as a double-charge risk.
      qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['escrow-events', escrowId] });
      qc.invalidateQueries({ queryKey: ['escrow'] });
      return true;
    } catch (e) {
      setError(escrowErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    isBusy,
    error,
    clearError: () => setError(null),

    /**
     * Records consent to the advance schedule, and fixes the rate it was
     * given for. One call, because a consent stored apart from the figure it
     * was given for is consent to nothing in particular. Null means the
     * client accepted the vendor's proposal unchanged.
     *
     * Returns whether it stuck, so a caller that charges next can stop rather
     * than send the client to a payment page the server will refuse.
     */
    acceptAdvanceTerms: (advanceRate: number | null = null) =>
      run('accept_advance_terms', {
        p_booking_id: bookingId,
        p_advance_rate: advanceRate,
      }),

    /** The client's half of the release; a Finance admin still approves it. */
    confirmRelease: async () => {
      await run('client_confirm_release', { p_escrow_id: escrowId });
    },

    /** Freezes both timers and puts the escrow in front of a human. */
    raiseIssue: async (reason: string) => {
      await run('open_dispute', { p_escrow_id: escrowId, p_reason: reason });
    },
  };
}

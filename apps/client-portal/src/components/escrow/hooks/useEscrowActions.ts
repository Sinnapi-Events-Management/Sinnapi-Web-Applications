import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { escrowErrorMessage } from '@/hooks/queries';

/**
 * Escrow can be confirmed while funds are still held — including after the
 * advance tranche has gone out, which leaves the balance held and is the
 * normal state for a booking whose event has already happened.
 */
const CONFIRMABLE_STATUSES = ['held', 'advance_released'];
/** A dispute is open to the client until the release actually settles. */
const DISPUTABLE_STATUSES = ['held', 'awaiting_advance', 'advance_released', 'release_requested'];

/**
 * The input-free escrow actions and the dialog state around the one that isn't.
 * Which actions are offered is derived from the escrow's status, so the buttons
 * can't advertise a transition the RPC would refuse.
 */
export function useEscrowActions(escrowId: string, status: string) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  async function confirmRelease() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('client_confirm_release', {
      p_escrow_id: escrowId,
    });
    setBusy(false);
    if (rpcError) {
      // Postgres exception text ('booking_not_completed') is a wire format,
      // not something to put in front of a client.
      setError(escrowErrorMessage(rpcError));
      return;
    }
    qc.invalidateQueries({ queryKey: ['escrow'] });
  }

  return {
    busy,
    error,
    disputeOpen,
    openDispute: () => setDisputeOpen(true),
    closeDispute: () => setDisputeOpen(false),
    canConfirm: CONFIRMABLE_STATUSES.includes(status),
    canDispute: DISPUTABLE_STATUSES.includes(status),
    confirmRelease,
  };
}

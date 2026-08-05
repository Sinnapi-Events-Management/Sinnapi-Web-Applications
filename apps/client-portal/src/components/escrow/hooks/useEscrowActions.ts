import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Escrow can only be released while the funds are still held. */
const CONFIRMABLE_STATUSES = ['held'];
/** A dispute is open to the client until the release actually settles. */
const DISPUTABLE_STATUSES = ['held', 'release_requested'];

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
      setError(rpcError.message);
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

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PayoutModel } from '@/lib/types';

export type SettlementMethod =
  | 'bank_deposit'
  | 'mtn_momo'
  | 'airtel_money'
  | 'merchant'
  | 'cash'
  | 'other';

export const SETTLEMENT_METHODS: Array<{ value: SettlementMethod; label: string; hint: string }> = [
  { value: 'bank_deposit', label: 'Bank deposit', hint: 'Deposit slip or transfer confirmation' },
  { value: 'mtn_momo', label: 'MTN Mobile Money', hint: 'Transaction ID from the MoMo receipt' },
  { value: 'airtel_money', label: 'Airtel Money', hint: 'Transaction ID from the Airtel receipt' },
  { value: 'merchant', label: 'Merchant transfer', hint: 'Merchant transaction reference' },
  { value: 'cash', label: 'Cash', hint: 'Signed acknowledgement from the vendor' },
  { value: 'other', label: 'Other', hint: 'Describe it in the notes' },
];

const PROOF_BUCKET = 'payout-proofs';
const MAX_PROOF_MB = 20;

/**
 * Recording a manual settlement — the maker half of the control.
 *
 * Sinnapi holds no payout API, so this is the only record that money left the
 * platform. Both a reference and a proof file are required by the RPC, not
 * merely by this form: cash in particular has no provider reference to fall
 * back on, and an unevidenced settlement is indistinguishable from a missing
 * one when it is reconciled months later.
 */
export function useSettlementForm(payout: PayoutModel | null, onDone: () => void) {
  const qc = useQueryClient();

  const [method, setMethod] = useState<SettlementMethod>('bank_deposit');
  const [reference, setReference] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMethod('bank_deposit');
    setReference('');
    setDestination('');
    setNotes('');
    setProof(null);
    setError(null);
  }

  function selectProof(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_PROOF_MB * 1024 * 1024) {
      setError(`Proof must be under ${MAX_PROOF_MB}MB.`);
      return;
    }
    setError(null);
    setProof(file);
  }

  async function submit() {
    if (!payout) return;
    if (!reference.trim()) {
      setError('A transaction reference is required.');
      return;
    }
    if (!proof) {
      setError('Attach proof of the transfer — a receipt, deposit slip or signed acknowledgement.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      // Path is keyed by payout so the object is unambiguous in an audit, and
      // the bucket is private with no update or delete policy — evidence is
      // append-only once it is in.
      const safeName = proof.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${payout.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROOF_BUCKET)
        .upload(path, proof, { upsert: false, contentType: proof.type });
      if (uploadError) throw uploadError;

      const { error: rpcError } = await supabase.rpc('record_payout_settlement', {
        p_payout_id: payout.id,
        p_method: method,
        p_reference: reference.trim(),
        p_proof_path: path,
        p_proof_file_name: proof.name,
        p_destination: destination.trim() || null,
        p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;

      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
      qc.invalidateQueries({ queryKey: ['admin-escrow'] });
      reset();
      onDone();
    } catch (e) {
      setError(settlementError(e));
    } finally {
      setBusy(false);
    }
  }

  return {
    method,
    setMethod,
    reference,
    setReference,
    destination,
    setDestination,
    notes,
    setNotes,
    proof,
    selectProof,
    clearProof: () => setProof(null),
    busy,
    error,
    submit,
    reset,
    methodHint: SETTLEMENT_METHODS.find((m) => m.value === method)?.hint ?? '',
  };
}

/** Postgres exception text is a wire format, not something to put on screen. */
export function settlementError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  if (raw.includes('segregation_of_duties')) {
    return 'You recorded this settlement, so a different Finance admin has to approve it.';
  }
  if (raw.includes('payout_blocked')) {
    return 'This vendor has no primary payout account on file, so the payout cannot be settled yet.';
  }
  if (raw.includes('reference_required')) return 'A transaction reference is required.';
  if (raw.includes('proof_required')) return 'Proof of the transfer is required.';
  if (raw.includes('invalid_state')) return 'This payout has already moved on — refresh and retry.';
  if (raw.includes('forbidden')) return 'You do not have permission to do that.';
  if (raw.includes('Duplicate')) return 'That proof file has already been uploaded.';
  return raw || 'Something went wrong. Please try again.';
}

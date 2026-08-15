import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availableQuotationActions,
  isQuoteLapsed,
  quotationActionError,
  type QuotationAction,
  type QuotationActionSpec,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * The RPC behind each action a client may take, as `[function, args]`.
 *
 * `accept` and `revise` are two `p_action` values of one function while `void`
 * is its own, because they are two different authorisations on the server: one
 * is the client answering an offer, the other is either party calling the
 * whole thread off.
 */
const CALLS: Partial<Record<QuotationAction, (id: string, reason: string) => [string, object]>> = {
  accept: (id) => ['respond_quotation', { p_quotation_id: id, p_action: 'accept' }],
  revise: (id, reason) => [
    'respond_quotation',
    { p_quotation_id: id, p_action: 'revise', p_reason: reason || null },
  ],
  void: (id, reason) => ['void_quotation', { p_quotation_id: id, p_reason: reason }],
};

/**
 * What the client may do to this quotation right now, and the confirm-then-act
 * sequence behind each one.
 *
 * The available set comes from the shared lifecycle spec rather than from
 * conditions written here, so the buttons this page offers and the moves the
 * server will accept are read from the same table. The one gate the spec cannot
 * express is the clock: `valid_until` is not a status, and a lapsed quote may
 * still be sent back or voided — it just cannot be accepted. That single
 * exception is applied below rather than smuggled into the spec's `from` sets,
 * which would have made an expired quote look settled when it is not.
 */
export function useQuotationActions(quotation: QuotationDetailModel | null | undefined) {
  const qc = useQueryClient();
  const quotationId = quotation?.id;

  const [pending, setPending] = useState<QuotationAction | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLapsed = isQuoteLapsed(quotation?.valid_until);

  const actions = useMemo<QuotationActionSpec[]>(() => {
    if (!quotation) return [];
    return availableQuotationActions(quotation.status, 'client').filter(
      (spec) => !(spec.action === 'accept' && isLapsed),
    );
  }, [quotation, isLapsed]);

  const request = useCallback((action: QuotationAction) => {
    setError(null);
    setReason('');
    setPending(action);
  }, []);

  const cancel = useCallback(() => {
    setError(null);
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!quotationId) return;
    // Dispatched on the pending action rather than assumed, so an action with
    // no entry does nothing instead of quietly firing the wrong RPC.
    const call = CALLS[pending as QuotationAction];
    if (!call) return;

    setBusy(true);
    setError(null);

    const [fn, args] = call(quotationId, reason.trim());
    const { error: rpcError } = await supabase.rpc(fn, args);
    setBusy(false);

    if (rpcError) {
      setError(quotationActionError(rpcError));
      return;
    }

    setPending(null);
    // The quotation row carries the status the whole page reads from, and the
    // trail gains a row on every transition. Accepting also writes the advance
    // terms onto the linked booking, and the dashboard counts quotes awaiting
    // an answer — so all four go stale on the same write.
    qc.invalidateQueries({ queryKey: ['quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['quotation-history', quotationId] });
    qc.invalidateQueries({ queryKey: ['quotations'] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
  }, [pending, quotationId, reason, qc]);

  return {
    /** The actions to offer, in spec order. Empty once the quote is settled. */
    actions,
    /** The action awaiting confirmation, or `null` when no dialog is open. */
    pending,
    reason,
    setReason,
    isBusy,
    error,
    request,
    cancel,
    confirm,

    /**
     * Set when the only reason Accept is missing is the clock. The card says so
     * rather than silently dropping the button — a client looking at a quote
     * they meant to accept deserves the sentence, not a page that has quietly
     * stopped offering it.
     */
    lapsedBlocksAccept: isLapsed && ['sent', 'revised'].includes(quotation?.status ?? ''),
  };
}

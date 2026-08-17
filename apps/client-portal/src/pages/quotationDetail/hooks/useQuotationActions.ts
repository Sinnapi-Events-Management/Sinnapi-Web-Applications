import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availableQuotationActions,
  isQuoteLapsed,
  isQuoteUnpriced,
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
/**
 * The statuses at which an Accept would otherwise be on offer — the same set
 * `respond_quotation` will answer to. A quote outside them has nothing blocking
 * its Accept because it was never going to have one, and saying "this cannot be
 * accepted" over a quote that is already accepted is noise.
 */
const ANSWERABLE_STATUSES = ['sent', 'revised'];

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
 * server will accept are read from the same table. Two gates the spec cannot
 * express are applied on top of it, and both block only `accept`:
 *
 *   the clock  `valid_until` is not a status, and a lapsed quote may still be
 *              sent back or voided — it just cannot be agreed to.
 *   the price  a quote with no total is not an offer. Accepting one binds
 *              nothing and produces a booking worth nothing, which is the
 *              failure `20260816000009` exists to close on the server.
 *
 * Neither is smuggled into the spec's `from` sets. Doing that would make a
 * broken or expired quote look settled, when in both cases the thread is still
 * live and the client can still answer it — they just cannot say yes.
 */
export function useQuotationActions(quotation: QuotationDetailModel | null | undefined) {
  const qc = useQueryClient();
  const quotationId = quotation?.id;

  const [pending, setPending] = useState<QuotationAction | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLapsed = isQuoteLapsed(quotation?.valid_until);
  const isUnpriced = isQuoteUnpriced(quotation?.total);

  const actions = useMemo<QuotationActionSpec[]>(() => {
    if (!quotation) return [];
    return availableQuotationActions(quotation.status, 'client').filter(
      (spec) => !(spec.action === 'accept' && (isLapsed || isUnpriced)),
    );
  }, [quotation, isLapsed, isUnpriced]);

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
     * Why Accept is missing from a quote that would otherwise offer it, or
     * `null` when it is not missing.
     *
     * The card says so rather than silently dropping the button — a client
     * looking at a quote they meant to accept deserves the sentence, not a page
     * that has quietly stopped offering it. One value rather than a flag per
     * reason because a quote can be both unpriced and lapsed, and the card must
     * still show exactly one explanation.
     *
     * `unpriced` wins that tie. It is the more fundamental fault and names the
     * thing the vendor has to fix; a missing price is the reason there is
     * nothing here to accept, whether or not the clock has also run out.
     */
    acceptBlockedBy: !ANSWERABLE_STATUSES.includes(quotation?.status ?? '')
      ? null
      : isUnpriced
        ? ('unpriced' as const)
        : isLapsed
          ? ('lapsed' as const)
          : null,
  };
}

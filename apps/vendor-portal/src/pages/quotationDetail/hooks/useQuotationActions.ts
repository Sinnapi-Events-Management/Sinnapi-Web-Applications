import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availableQuotationActions,
  quotationActionError,
  type QuotationAction,
  type QuotationActionSpec,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * The RPC behind each action a vendor may take. One entry today; the shape is
 * what keeps a second from being wired up as another branch in `confirm`.
 */
const CALLS: Partial<Record<QuotationAction, (id: string, reason: string) => [string, object]>> = {
  withdraw: (id, reason) => ['void_quotation', { p_quotation_id: id, p_reason: reason }],
};

/**
 * What the vendor may do to this quotation's state right now, and the
 * confirm-then-act sequence behind it.
 *
 * The available set comes from the shared lifecycle spec rather than from
 * conditions written here, so the buttons this page offers and the moves the
 * server will accept are read from the same table. Sending a quote is
 * deliberately not among them — that is the builder's submit, which writes line
 * items and prices in one call and belongs to the form, not to a status menu.
 */
export function useQuotationActions(quotation: QuotationDetailModel | null | undefined) {
  const qc = useQueryClient();
  const quotationId = quotation?.id;

  const [pending, setPending] = useState<QuotationAction | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo<QuotationActionSpec[]>(
    () => (quotation ? availableQuotationActions(quotation.status, 'vendor') : []),
    [quotation],
  );

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
    // The quotation row carries the status the whole page reads from, the trail
    // gains a row on every transition, and the list counts quotes by status.
    qc.invalidateQueries({ queryKey: ['v-quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotation-history', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotations'] });
    qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }, [pending, quotationId, reason, qc]);

  return {
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
  };
}

import { useMemo } from 'react';
import { remainingQuotationLifecycle, type StatusTimelineStep } from '@sinnapi/ui';
import { useQuotationStatusHistory } from '@/hooks/queries';

/**
 * The quotation's status trail as steps to render: what has happened, then what
 * is still expected.
 *
 * History is trigger-written on insert and on every status change, so the
 * happened half is authoritative rather than inferred — including the client's
 * own moves, which the quotation row itself does not record, and the reason
 * they gave when they declined or sent it back. For the console that reason is
 * usually the whole point of opening the page.
 *
 * Deliberately the same derivation as the two portals'. An operator reading
 * this trail during a dispute should see the steps the party on the phone is
 * describing, in the same order, with the same projected tail.
 */
export function useQuotationTimeline(quotationId: string, status: string | undefined) {
  const { data, isLoading, error } = useQuotationStatusHistory(quotationId);

  const steps = useMemo<StatusTimelineStep[]>(() => {
    const done: StatusTimelineStep[] = (data ?? []).map((e) => ({
      key: e.id,
      status: e.to_status,
      occurredAt: e.occurred_at,
      reason: e.reason,
      done: true,
    }));

    // The trail's tail is projected from the quotation's own status rather than
    // from the last history row: they agree in practice, but the quotation is
    // the record the rest of the page renders, so a lagging history read must
    // never make the page contradict itself.
    const pending = status
      ? remainingQuotationLifecycle(status).map((s) => ({
          key: `pending-${s}`,
          status: s,
          occurredAt: null,
          reason: null,
          done: false,
        }))
      : [];

    return [...done, ...pending];
  }, [data, status]);

  return { steps, isLoading, error };
}

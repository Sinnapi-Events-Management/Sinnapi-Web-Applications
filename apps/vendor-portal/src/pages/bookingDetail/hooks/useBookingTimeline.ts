import { useMemo } from 'react';
import { remainingLifecycle, type StatusTimelineStep } from '@sinnapi/ui';
import { useVendorBookingStatusHistory } from '@/hooks/queries';

/**
 * The booking's status trail as steps to render: what has happened, then what is
 * still expected.
 *
 * History is trigger-written on insert and on every status change, so the
 * happened half is authoritative rather than inferred — including the client's
 * own moves, which the booking row itself does not record. The projected half
 * exists so a booking waiting on someone's action shows what that action is; it
 * disappears once the booking is cancelled or declined, where there is no "next"
 * to point at.
 */
export function useBookingTimeline(bookingId: string, status: string | undefined) {
  const { data, isLoading, error } = useVendorBookingStatusHistory(bookingId);

  const steps = useMemo<StatusTimelineStep[]>(() => {
    const done: StatusTimelineStep[] = (data ?? []).map((e) => ({
      key: e.id,
      status: e.to_status,
      occurredAt: e.occurred_at,
      reason: e.reason,
      done: true,
    }));

    // The trail's tail is projected from the booking's own status rather than
    // from the last history row: they agree in practice, but the booking is the
    // record the rest of the page renders, so a lagging history read must never
    // make the page contradict itself.
    const pending = status
      ? remainingLifecycle(status).map((s) => ({
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

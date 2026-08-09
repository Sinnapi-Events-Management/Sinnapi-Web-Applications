import { useMemo } from 'react';
import { useVendorBookingStatusHistory } from '@/hooks/queries';
import { remainingLifecycle } from '../utils/lifecycle';

/**
 * A step on the rendered trail. `done` entries are drawn from real history rows
 * and carry a timestamp; the rest are projections of where the booking is headed
 * and carry none.
 */
export type TimelineStep = {
  key: string;
  status: string;
  occurredAt: string | null;
  reason: string | null;
  done: boolean;
};

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

  const steps = useMemo<TimelineStep[]>(() => {
    const done: TimelineStep[] = (data ?? []).map((e) => ({
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

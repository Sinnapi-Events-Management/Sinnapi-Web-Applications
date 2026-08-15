import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bookingActionError } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { bookingStatusSpec, type BookingStatusTarget } from '../schema/statusActions';

/**
 * The console's booking lifecycle override: confirm-then-act, with a mandatory
 * reason.
 *
 * The reason is not decoration. An operator changing someone else's booking is
 * exactly the event a colleague reads back a month later, and an unexplained
 * one is indistinguishable from a mistake — so `admin_set_booking_status`
 * refuses without it and the dialog cannot be submitted without it. It lands in
 * `booking_status_history` beside the transition and in `audit_logs` beside the
 * override, which is why it appears twice on the activity trail.
 *
 * One hook for all four targets rather than one per transition: they differ
 * only in the status they submit and the copy they show, both of which come
 * from the spec. Four near-identical hooks would be four places to forget an
 * invalidation.
 */
export function useBookingStatus(bookingId: string) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<BookingStatusTarget | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((status: BookingStatusTarget) => {
    setErr(null);
    setReason('');
    setPending(status);
  }, []);

  const cancel = useCallback(() => {
    setErr(null);
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);

    const { error } = await supabase.rpc('admin_set_booking_status', {
      p_booking_id: bookingId,
      p_status: pending,
      p_reason: reason.trim(),
    });
    setBusy(false);

    if (error) {
      setErr(bookingActionError(error));
      return;
    }

    setNotice(`Booking moved to ${bookingStatusSpec(pending).label.toLowerCase()}.`);
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-booking', bookingId] });
    // The override writes to booking_status_history and audit_logs, both of
    // which the trail unions — it is stale the moment the write lands.
    qc.invalidateQueries({ queryKey: ['admin-booking-activity', bookingId] });
    qc.invalidateQueries({ queryKey: ['admin-bookings'] });
  }, [pending, bookingId, reason, qc]);

  return {
    pending,
    reason,
    setReason,
    busy,
    err,
    notice,
    clearNotice: useCallback(() => setNotice(null), []),
    request,
    cancel,
    confirm,
  };
}

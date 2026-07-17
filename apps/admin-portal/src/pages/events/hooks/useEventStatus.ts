import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EventStatus } from '@/lib/status';

/** The status change awaiting confirmation, and the event it applies to. */
export type PendingStatusChange = {
  id: string;
  title: string;
  status: EventStatus;
};

/** Minimal shape an event row needs to be actionable. */
type EventLike = { id: string; title: string };

/**
 * Owns the confirm-then-write flow for an event's lifecycle status. Unlike the
 * vendor equivalent, events carry no status-change reason, so the confirm is a
 * plain yes/no. Shared by every entry point that changes status so they all
 * confirm identically.
 */
export function useEventStatus() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Ask for confirmation — does not write. */
  const request = useCallback((event: EventLike, status: EventStatus) => {
    setErr(null);
    setPending({ id: event.id, title: event.title, status });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  /** Apply the pending change. */
  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from('events')
      .update({ status: pending.status })
      .eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const changedId = pending.id;
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-events'] });
    qc.invalidateQueries({ queryKey: ['event', changedId] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}

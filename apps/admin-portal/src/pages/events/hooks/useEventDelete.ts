import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** The event awaiting delete confirmation. */
export type PendingDelete = {
  id: string;
  title: string;
};

/** Minimal shape the delete flow needs. */
type EventLike = { id: string; title: string };

/**
 * Owns the confirm-then-delete flow. The write looks like a hard delete but is
 * not: a BEFORE DELETE trigger on every table with a `deleted_at` column
 * (20260618000010_triggers.sql) rewrites it into `set deleted_at = now(),
 * deleted_by = auth.uid()` and cancels the physical delete, so the row survives
 * and no foreign key cascades fire.
 *
 * Two consequences worth knowing:
 *  - Never chain `.select()` here to assert rows came back. The cancelled DELETE
 *    has nothing to RETURN, so a *successful* delete yields an empty array.
 *  - The row only leaves the list because `search_events_admin` filters
 *    `deleted_at is null`.
 */
export function useEventDelete(opts?: { onDeleted?: () => void }) {
  const { onDeleted } = opts ?? {};
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Ask for confirmation — does not write. */
  const request = useCallback((event: EventLike) => {
    setErr(null);
    setPending({ id: event.id, title: event.title });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('events').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const deletedId = pending.id;
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-events'] });
    qc.invalidateQueries({ queryKey: ['event', deletedId] });
    onDeleted?.();
  }, [pending, qc, onDeleted]);

  return { pending, busy, err, request, cancel, confirm };
}

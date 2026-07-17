import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { EventModel } from '@/lib/types';
import { toUpdatePayload, type EventFormValues } from '../schema';

/**
 * Owns the edit drawer: which event is open, the full record behind it, and the
 * write. The list row carries only a projection, so opening fetches the complete
 * event through the shared `useEvent` query — the drawer shows a loading state
 * until it lands, and the cached record is reused on reopen.
 */
export function useEventEdit() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Passing '' keeps the query disabled while the drawer is closed.
  const { data, isLoading, error: loadError } = useEvent(editingId ?? '');
  const event = editingId ? (data ?? null) : null;

  const open = useCallback((e: EventModel) => {
    setErr(null);
    setEditingId(e.id);
  }, []);

  const close = useCallback(() => {
    setEditingId(null);
    setErr(null);
  }, []);

  /** Writes the edit. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: EventFormValues): Promise<boolean> => {
      if (!editingId) return false;
      setBusy(true);
      setErr(null);
      const { error } = await supabase
        .from('events')
        .update(toUpdatePayload(values))
        .eq('id', editingId);
      setBusy(false);
      if (error) {
        setErr(error.message);
        return false;
      }
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['event', editingId] });
      return true;
    },
    [editingId, qc],
  );

  return {
    event,
    isOpen: !!editingId,
    loading: !!editingId && isLoading,
    loadError: loadError instanceof Error ? loadError.message : null,
    busy,
    err,
    open,
    close,
    save,
  };
}

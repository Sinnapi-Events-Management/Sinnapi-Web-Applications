import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EventTypeModel } from '@/lib/types';
import { toWritePayload, type EventTypeFormValues } from '../schema';

/** Postgres unique-violation — `event_types.key` is unique. */
const UNIQUE_VIOLATION = '23505';

export type EventTypeDrawerMode = 'create' | 'edit';

/**
 * Owns the event-type drawer, shared between create and edit. A list row
 * already carries every editable field, so editing needs no extra fetch — the
 * row is handed straight to the form.
 */
export function useEventTypeEdit() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EventTypeModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setErr(null);
    setEditing(null);
    setCreating(true);
  }, []);

  const openEdit = useCallback((eventType: EventTypeModel) => {
    setErr(null);
    setCreating(false);
    setEditing(eventType);
  }, []);

  const close = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  }, []);

  /** Inserts or updates the type. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: EventTypeFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const payload = toWritePayload(values);
      const { error } = editing
        ? await supabase.from('event_types').update(payload).eq('id', editing.id)
        : await supabase.from('event_types').insert(payload);
      setBusy(false);
      if (error) {
        setErr(
          error.code === UNIQUE_VIOLATION
            ? 'An event type with that key already exists. Change the name, or edit the existing type.'
            : error.message,
        );
        return false;
      }
      close();
      // The last key invalidates every surface that renders an event's occasion
      // label — a rename has to reach the admin lists too, not just the picker.
      qc.invalidateQueries({ queryKey: ['admin-event-types'] });
      qc.invalidateQueries({ queryKey: ['event-type-options'] });
      qc.invalidateQueries({ queryKey: ['event-type-next-sort-order'] });
      qc.invalidateQueries({ queryKey: ['event'] });
      return true;
    },
    [editing, qc, close],
  );

  return {
    isOpen: creating || !!editing,
    mode: (creating ? 'create' : 'edit') as EventTypeDrawerMode,
    eventType: editing,
    busy,
    err,
    openCreate,
    openEdit,
    close,
    save,
  };
}

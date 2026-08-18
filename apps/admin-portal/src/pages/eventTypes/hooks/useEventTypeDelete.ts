import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EventTypeModel } from '@/lib/types';

/** The event type awaiting delete confirmation. */
export type PendingEventTypeDelete = {
  id: string;
  name: string;
};

/**
 * Postgres foreign-key violation — raised by `events.event_type_id`, which does
 * not cascade. Deleting a type in use would rewrite history on every event
 * filed under it, so the database refuses and the admin deactivates instead.
 */
const FK_VIOLATION = '23503';

/**
 * Owns the confirm-then-delete flow. `event_types` has no `deleted_at` column,
 * so this is a hard delete, blocked by the database while any event still
 * references the type.
 */
export function useEventTypeDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingEventTypeDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((eventType: EventTypeModel) => {
    setErr(null);
    setPending({ id: eventType.id, name: eventType.name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('event_types').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(
        error.code === FK_VIOLATION
          ? 'Events are already filed under this type, so it can’t be deleted. Deactivate it instead — existing events keep it, and nobody can choose it again.'
          : error.message,
      );
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-event-types'] });
    qc.invalidateQueries({ queryKey: ['event-type-options'] });
    qc.invalidateQueries({ queryKey: ['event-type-next-sort-order'] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toInsertPayload, type EventFormValues } from '../schema';

/**
 * Owns the create drawer: whether it's open and the insert. New events are
 * always admin-sourced and posted by the acting admin, so `save` resolves the
 * current user before writing.
 */
export function useEventCreate() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = useCallback(() => {
    setErr(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setErr(null);
  }, []);

  /** Writes the new event. Returns true on success so the drawer can close. */
  const save = useCallback(
    async (values: EventFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBusy(false);
        setErr('Your session has expired. Sign in again to post an event.');
        return false;
      }
      const { error } = await supabase
        .from('events')
        .insert(toInsertPayload(values, { postedBy: user.id }));
      setBusy(false);
      if (error) {
        setErr(error.message);
        return false;
      }
      setIsOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      return true;
    },
    [qc],
  );

  return { isOpen, busy, err, open, close, save };
}

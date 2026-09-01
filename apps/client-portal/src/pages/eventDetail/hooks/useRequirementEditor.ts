import { useCallback, useState } from 'react';
import type { EventRequirementModel } from '@/lib/types';

/**
 * Which line the form is editing, if any.
 *
 * A nullable row plus an open flag, rather than one nullable row doing both
 * jobs. "Add a line" is an open dialog with no row, so a single `editing`
 * value would make `null` mean both "closed" and "adding" — and the dialog
 * would unmount the moment a client cleared the form.
 *
 * The row is kept until the dialog has finished closing, so the fields do not
 * blank out underneath the exit transition.
 */
export function useRequirementEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<EventRequirementModel | null>(null);

  const add = useCallback(() => {
    setEditing(null);
    setIsOpen(true);
  }, []);

  const edit = useCallback((row: EventRequirementModel) => {
    setEditing(row);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, editing, add, edit, close };
}

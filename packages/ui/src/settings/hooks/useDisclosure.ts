'use client';
import { useCallback, useState } from 'react';

export type Disclosure = {
  open: boolean;
  show: () => void;
  hide: () => void;
};

/**
 * Open/closed state for a dialog. Trivial on its own; worth naming because both
 * settings sections keep a dialog and neither should be re-deriving the same
 * three lines — and because `hide` is stable, so it can be passed straight to
 * `onSuccess` callbacks without re-creating them every render.
 */
export function useDisclosure(initial = false): Disclosure {
  const [open, setOpen] = useState(initial);
  return {
    open,
    show: useCallback(() => setOpen(true), []),
    hide: useCallback(() => setOpen(false), []),
  };
}

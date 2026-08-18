'use client';
import { useCallback, useState } from 'react';

export type BadgeMenuState = {
  anchor: HTMLElement | null;
  open: boolean;
  onOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
};

export type UseBadgeMenuOptions = {
  /**
   * Fired on every open, before the panel paints. Hosts use it to flip a
   * lazily-enabled query on, which is why it must be idempotent — the shell
   * makes no promise about calling it exactly once.
   */
  onOpen?: () => void;
};

/**
 * Anchor state for a top-bar badge menu.
 *
 * Trivial on its own, and that is the point: the two panels in the top bar
 * (messages, notifications) both need it, and neither should carry `useState`
 * of its own for something this mechanical. Keeping it here also gives the
 * lazy-fetch trigger a single, named home — the panel component never touches
 * a query.
 */
export function useBadgeMenu({ onOpen }: UseBadgeMenuOptions = {}): BadgeMenuState {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchor(event.currentTarget);
      onOpen?.();
    },
    [onOpen],
  );

  const close = useCallback(() => setAnchor(null), []);

  return { anchor, open: !!anchor, onOpen: open, onClose: close };
}

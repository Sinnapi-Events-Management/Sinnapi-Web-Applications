'use client';
import { useCallback, useState, type KeyboardEvent } from 'react';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaViewerState<T extends MediaRecord> = {
  /** The item on screen, or null when the viewer is closed. */
  active: PlayableMedia<T> | null;
  /** Index of `active` in `items`; -1 when closed. */
  index: number;
  /** 1-based position for the "3 / 12" counter. */
  position: number;
  count: number;
  open: boolean;
  /** Arrows and the strip are pointless — and misleading — on one item. */
  canStep: boolean;
  openAt: (index: number) => void;
  goTo: (index: number) => void;
  close: () => void;
  next: () => void;
  previous: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

/**
 * Owns which media item the viewer is looking at.
 *
 * The open item is held as an *index into the same array the grid renders*, so
 * "next" walks the gallery in the order the vendor curated rather than through a
 * separate playlist, and the thumbnail strip can highlight the active item by
 * comparing indexes rather than ids. Stepping wraps in both directions: with a
 * handful of items, a dead arrow at either end is a worse answer than looping.
 *
 * Nothing here is derived from `items` by identity, so a background refetch that
 * returns an equal-but-new array does not disturb an open viewer.
 */
export function useMediaViewer<T extends MediaRecord>(
  items: PlayableMedia<T>[],
): MediaViewerState<T> {
  const [index, setIndex] = useState<number | null>(null);
  const count = items.length;

  const openAt = useCallback((next: number) => setIndex(next), []);
  const close = useCallback(() => setIndex(null), []);

  const goTo = useCallback(
    (next: number) => setIndex((current) => (current === null ? current : next)),
    [],
  );

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => (current === null ? null : (current + delta + count) % count));
    },
    [count],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') previous();
      else return;
      // Keep the arrows on the gallery: without this they also scroll the
      // dialog's content or move focus within the video controls.
      event.preventDefault();
    },
    [next, previous],
  );

  // A delete or a refetch can shrink the list under an open viewer; treating an
  // out-of-range index as "nothing to show" closes the dialog rather than
  // blanking it.
  const active = index === null ? null : (items[index] ?? null);

  return {
    active,
    index: active === null ? -1 : (index as number),
    position: active === null ? 0 : (index as number) + 1,
    count,
    open: active !== null,
    canStep: count > 1,
    openAt,
    goTo,
    close,
    next,
    previous,
    onKeyDown,
  };
}

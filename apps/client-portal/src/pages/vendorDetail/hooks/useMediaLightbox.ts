import { useCallback, useState } from 'react';
import type { PlayableMedia } from '../utils/mediaSource';

/**
 * Owns which portfolio item the viewer is looking at.
 *
 * The open item is held as an index into the same array the grid renders, so
 * "next" is a step through the gallery in the order the vendor curated rather
 * than a separate playlist. Stepping wraps in both directions: with a handful of
 * items, a dead arrow at either end is a worse answer than looping.
 */
export function useMediaLightbox(items: PlayableMedia[]) {
  const [index, setIndex] = useState<number | null>(null);
  const count = items.length;

  const openAt = useCallback((next: number) => setIndex(next), []);
  const close = useCallback(() => setIndex(null), []);

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => (current === null ? null : (current + delta + count) % count));
    },
    [count],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') previous();
      else return;
      // Keep the arrows on the gallery: without this they also scroll the
      // dialog's content or move focus within the video controls.
      event.preventDefault();
    },
    [next, previous],
  );

  // A refetch can shrink the list under an open viewer; treating an out-of-range
  // index as "nothing to show" closes the dialog instead of blanking it.
  const active = index === null ? null : (items[index] ?? null);

  return {
    active,
    /** 1-based position for the "3 / 12" counter. */
    position: index === null ? 0 : index + 1,
    count,
    open: active !== null,
    /** Arrows are pointless — and misleading — on a single-item gallery. */
    canStep: count > 1,
    openAt,
    close,
    next,
    previous,
    onKeyDown,
  };
}

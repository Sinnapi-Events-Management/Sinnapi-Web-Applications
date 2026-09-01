'use client';
import { useEffect, useState } from 'react';

/**
 * The clock a screenful of offers is resolved against.
 *
 * TWO PROBLEMS, ONE HOOK.
 *
 * The first is agreement. Every deadline, countdown and derived lifecycle on a
 * screen has to be computed against ONE instant, or two cards with the same
 * end date render two different countdowns and a grid flips rows to "Ended" at
 * thirty different moments. That is why `offerTimeLeft` and
 * `deriveOfferLifecycle` take `now` as an argument rather than reading the
 * clock themselves, and why this returns a value to thread down rather than
 * being called per card.
 *
 * The second is server rendering, and it is why this is not just `useNow`.
 * `@sinnapi/ui/data`'s `useNow` seeds its state with `Date.now()` on the first
 * render. In the marketing site that render happens on the server, where the
 * clock is not the visitor's, and React then hydrates a "3 days left" against a
 * "2 days left" and warns. Undefined until mounted is the honest first answer:
 * the server does not know what time it is where the reader is. Consumers
 * render nothing for that one frame rather than rendering something wrong.
 *
 * Fifteen minutes by default. Every boundary an offer has is a day or a couple
 * of hours away, so a minute tick would re-render a grid of cards sixty times
 * an hour to change nothing. Pass a shorter interval on a screen that shows a
 * live countdown in its final hours.
 */
export function useOfferClock(intervalMs = 900_000): number | undefined {
  const [now, setNow] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Set immediately on mount — this is the frame the server could not render,
    // and waiting a full interval to fill it would leave the deadline blank for
    // fifteen minutes.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

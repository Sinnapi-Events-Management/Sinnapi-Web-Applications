'use client';
import { useEffect, useState } from 'react';

/**
 * The current time, re-rendered on an interval.
 *
 * Exists for the settlement deadlines, which are hours rather than days: a
 * page left open while a six-hour clock runs out would otherwise keep saying
 * "4h left" until someone reloaded it — and the one thing a countdown must not
 * do is expire without telling you.
 *
 * A minute is the right granularity for those clocks and cheap enough to leave
 * running: one state write per minute per mounted countdown. Callers that need
 * something finer pass their own interval, but nothing in the portals does —
 * a per-second tick on a money decision reads as pressure, not information.
 *
 * `enabled` lets a caller stop the timer when there is nothing to count down
 * to, so a settled request costs nothing.
 */
export function useNow(intervalMs = 60_000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    // Sync immediately: a tab restored after being backgrounded for an hour
    // would otherwise show the time it was suspended at until the first tick.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}

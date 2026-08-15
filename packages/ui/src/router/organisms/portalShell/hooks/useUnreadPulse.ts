'use client';
import { useEffect, useRef, useState } from 'react';

/** How long the icon keeps ringing after a count goes up. */
const PULSE_MS = 1800;

/**
 * Grace period after mount in which an increase is assumed to be the count
 * query resolving, not an arrival. Badges start at 0 while their request is in
 * flight, so every page load ends with a 0 → N step that is a backlog being
 * revealed rather than anything happening.
 */
const WARMUP_MS = 2500;

/**
 * True for a moment after `count` increases.
 *
 * A badge that silently ticks from 2 to 3 is a change nobody sees — the number
 * is already on screen, so nothing about the pixels says "this just happened".
 * A brief ring on the icon is the smallest honest cue for an arrival, and it
 * costs the reader nothing: it decays on its own and interrupts nothing.
 *
 * Only *increases* pulse. Reading a thread drops the count, and celebrating
 * that would train people to ignore the animation entirely. Nor does the count
 * simply appearing pulse: arriving on a page with nine unread messages is a
 * backlog, not an arrival, and the shell mounts before either count query has
 * answered.
 */
export function useUnreadPulse(count: number): boolean {
  const [pulsing, setPulsing] = useState(false);
  const previous = useRef<number | null>(null);
  // Wall-clock rather than a "have I settled" flag: the two badges resolve at
  // different times, and a flag would have to guess which change was the one
  // that mattered.
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = count;
    if (before === null || count <= before) return;
    if (Date.now() - mountedAt.current < WARMUP_MS) return;

    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [count]);

  return pulsing;
}

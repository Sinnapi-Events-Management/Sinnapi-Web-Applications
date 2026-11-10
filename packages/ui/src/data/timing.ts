'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Request pacing for searchable, server-paginated lists — every interval in one
 * place, so the four lists (vendor + client Bookings and Quotations) cannot
 * drift apart and a tuning change is a one-line edit.
 *
 * The rule throughout: a CONTROL always updates instantly (the field, the
 * dropdown, the chip, the page number); only the REQUEST it causes is paced.
 * Nothing feels delayed; bursts just collapse into one call.
 */
export const LIST_TIMING = {
  /** Typing → search request. One request per pause, not per character. */
  searchDebounceMs: 300,
  /** Shortest search term sent to the server; shorter reads as "no search". */
  searchMinLength: 2,
  /** Dropdown / date / chip change → list request. Collapses "remove 3 chips". */
  filterDebounceMs: 250,
  /**
   * Extra wait for the facet-count request, after the list's own filters have
   * settled. Counts are the heaviest call (the search runs once per facet) and
   * the least urgent, so the rows land first.
   */
  countsDelayMs: 350,
  /** How long a set of counts is reused before it is fetched again. */
  countsStaleMs: 60_000,
  /**
   * Page / page-size / sort clicks → request. Leading edge, so a single click
   * is instant; hammering "next" sends at most one request per window.
   */
  pageThrottleMs: 300,
} as const;

/**
 * `value`, delayed until it has stopped changing for `delay` ms.
 *
 * Compares by identity, so hand it a primitive or a memoized object.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
    // `debounced` is read only to skip a no-op timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return debounced;
}

/**
 * `value`, updated at most once per `interval` ms — leading AND trailing edge.
 *
 * Leading: the first change after a quiet period passes straight through, so a
 * single click never waits. Trailing: the last change inside a busy window is
 * always delivered, so the final state is never dropped. `interval <= 0`
 * disables it and returns `value` untouched.
 *
 * Compares by identity, so hand it a primitive or a memoized object.
 */
export function useThrottledValue<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastEmit = useRef(0);

  useEffect(() => {
    if (interval <= 0 || Object.is(value, throttled)) return;
    const emit = () => {
      lastEmit.current = Date.now();
      setThrottled(value);
    };
    const wait = lastEmit.current + interval - Date.now();
    if (wait <= 0) {
      emit();
      return;
    }
    const timer = setTimeout(emit, wait);
    return () => clearTimeout(timer);
    // `throttled` is read only to skip a no-op emit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, interval]);

  return interval <= 0 ? value : throttled;
}

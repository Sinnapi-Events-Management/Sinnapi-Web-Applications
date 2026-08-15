'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Last-resort wording when a rejection carries nothing readable. */
const FALLBACK = 'Something went wrong. Please try again.';

/**
 * Best-effort readable message from an unknown rejection. Supabase surfaces
 * `Error`s, our own handlers throw `Error`s with sentences in them, and a bare
 * string still shows up occasionally — anything else is not worth guessing at.
 */
export function errorMessage(cause: unknown, fallback = FALLBACK): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause === 'string' && cause.trim()) return cause;
  return fallback;
}

export type AsyncActionState<A extends unknown[]> = {
  run: (...args: A) => void;
  busy: boolean;
  error: string | null;
  /** True from the moment the action resolved until something resets it. */
  done: boolean;
  reset: () => void;
};

/**
 * One-shot async action with the busy / error / done triple every settings
 * control needs.
 *
 * Extracted because the export button, the deletion request and the password
 * write are the same state machine wearing three labels, and each had otherwise
 * been three `useState`s and a try/catch copied per call site. Fire-and-forget
 * by design: `run` returns void so a click handler can call it directly without
 * an unhandled-rejection warning, and the outcome is read off the returned
 * state rather than awaited.
 *
 * The mounted check matters here specifically: the deletion and password
 * actions live inside dialogs that close on success, so a `setState` after the
 * component is gone is the normal path, not an edge case.
 */
export function useAsyncAction<A extends unknown[] = []>(
  action: (...args: A) => Promise<void>,
  options: { onSuccess?: () => void } = {},
): AsyncActionState<A> {
  const { onSuccess } = options;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    (...args: A) => {
      setError(null);
      setDone(false);
      setBusy(true);
      void (async () => {
        try {
          await action(...args);
          if (!alive.current) return;
          setDone(true);
          onSuccess?.();
        } catch (cause) {
          if (alive.current) setError(errorMessage(cause));
        } finally {
          if (alive.current) setBusy(false);
        }
      })();
    },
    [action, onSuccess],
  );

  const reset = useCallback(() => {
    setError(null);
    setDone(false);
  }, []);

  return { run, busy, error, done, reset };
}

import { useEffect, useState } from 'react';

/**
 * The "Please fix this first" list for a step form, frozen at the moment Next
 * was pressed. It used to track the errors live, so leaving a field shrank the
 * box and shifted everything below it mid-tap — a vendor tapping
 * "Automatically" hit the option beneath instead (found 2026-11-17).
 *
 * `compute` reads the form's errors; it runs in an effect after the press, by
 * which time validation has re-rendered with fresh errors (reading them inside
 * the async Next handler saw the stale set).
 */
export function useMissingSnapshot(compute: () => string[]) {
  const [attempt, setAttempt] = useState(0);
  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    if (attempt > 0) setList(compute());
    // Only on a new attempt — never as the person types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return {
    missing: list,
    /** Call when Next was refused. */
    refused: () => setAttempt((n) => n + 1),
    /** Call when moving between steps. */
    clear: () => setList([]),
  };
}

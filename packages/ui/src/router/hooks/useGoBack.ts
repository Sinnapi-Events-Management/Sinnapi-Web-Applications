'use client';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * "Back" that returns the visitor to wherever they actually came from, with a
 * safe landing spot when there is nowhere to return to.
 *
 * React Router stamps an incrementing `idx` onto every history entry it pushes.
 * An `idx` of 0 — or none at all — means this entry is the first of the browsing
 * session, which is the case for a shared link, a bookmark or a new tab. Calling
 * `navigate(-1)` there walks the user out of the app entirely (or does nothing
 * at all, leaving a dead button), so those visits are sent to `fallback`
 * instead. The check is read at click time rather than at render, since the
 * entry a component was mounted under can be replaced beneath it.
 *
 * Lives outside the root barrel because it depends on react-router-dom — import
 * from `@sinnapi/ui/router`.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();

  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [fallback, navigate]);
}

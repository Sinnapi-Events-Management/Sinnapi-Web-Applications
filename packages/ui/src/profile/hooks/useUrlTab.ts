import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UseUrlTabOptions = {
  /** Query-string key. Defaults to `tab`. */
  param?: string;
};

/**
 * Keeps the active section in the URL, so `/profile?tab=security` deep-links and
 * a reload — or a shared link — lands on the same section the user was reading.
 *
 * The first entry in `tabs` is the default and is represented by the *absence* of
 * the parameter, which keeps the canonical URL clean and means adding a section
 * later can never re-point an existing link. An unrecognised value falls back to
 * that default rather than rendering nothing, so a hand-edited URL degrades
 * gracefully.
 *
 * `replace` keeps tab switching out of the history stack: Back returns to
 * wherever the user came from rather than walking them through the tabs they
 * happened to click.
 */
export function useUrlTab<T extends string>(tabs: readonly T[], options?: UseUrlTabOptions) {
  const param = options?.param ?? 'tab';
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(param);
  const tab: T = tabs.includes(raw as T) ? (raw as T) : tabs[0];

  const setTab = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams);
      if (next === tabs[0]) params.delete(param);
      else params.set(param, next);
      setSearchParams(params, { replace: true });
    },
    // `tabs` is a module-level constant at every call site; listing `tabs[0]`
    // rather than the array keeps this stable without a memo at each caller.
    [param, searchParams, setSearchParams, tabs],
  );

  return { tab, setTab };
}

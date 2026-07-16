import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PageFilters } from '@/lib/table';

/** Sentinel for the unfiltered tab. Never written to the URL or the query. */
export const ALL_STATUSES = 'all';

export type StatusFilterValue<S extends string> = S | typeof ALL_STATUSES;

export type StatusFilter<S extends string> = {
  /** Currently selected status, or `all`. */
  value: StatusFilterValue<S>;
  /** Ready to merge into `PageParams`; `undefined` while on the `all` tab. */
  filters: PageFilters | undefined;
  setValue: (next: StatusFilterValue<S>) => void;
};

/**
 * Owns a single status filter for a server-paginated list, mirrored into the
 * URL so a filtered queue is refresh-safe, shareable, and restored when coming
 * back from a detail page.
 *
 * An unrecognised or absent param falls back to `all` rather than querying a
 * status that cannot exist — a hand-edited URL degrades to the full list
 * instead of an empty table.
 */
export function useStatusFilter<S extends string>(opts: {
  /** Allowed statuses; anything else in the URL is ignored. */
  valid: readonly S[];
  /** Column the status is filtered on. Defaults to `status`. */
  column?: string;
  /** URL search param name. Defaults to `status`. */
  param?: string;
  /** Called after a change — pass a page reset so filtering starts on page 1. */
  onChange?: () => void;
}): StatusFilter<S> {
  const { valid, column = 'status', param = 'status', onChange } = opts;
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(param);
  const value: StatusFilterValue<S> = useMemo(
    () => ((valid as readonly string[]).includes(raw ?? '') ? (raw as S) : ALL_STATUSES),
    [raw, valid],
  );

  const filters = useMemo(
    () => (value === ALL_STATUSES ? undefined : { [column]: value }),
    [value, column],
  );

  const setValue = useCallback(
    (next: StatusFilterValue<S>) => {
      setSearchParams(
        (prev) => {
          // Rebuild from `prev` so unrelated params (and other filters) survive.
          const nextParams = new URLSearchParams(prev);
          if (next === ALL_STATUSES) nextParams.delete(param);
          else nextParams.set(param, next);
          return nextParams;
        },
        { replace: true },
      );
      onChange?.();
    },
    [param, setSearchParams, onChange],
  );

  return { value, filters, setValue };
}

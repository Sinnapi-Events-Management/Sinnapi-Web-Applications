import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EventAdminFilters } from '@/hooks/queries';
import { isValidPublic, isValidSource } from '../schema/filters';

const SOURCE_PARAM = 'source';
const PUBLIC_PARAM = 'public';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

/** Raw field values for the toolbar controls (all strings). */
export type EventFilterValues = {
  /** `event_source` value, or `''` for any. */
  source: string;
  /** `'true'` | `'false'` | `''` for any. */
  isPublic: string;
  /** Inclusive `event_date` lower bound (yyyy-mm-dd), or `''`. */
  dateFrom: string;
  /** Inclusive `event_date` upper bound (yyyy-mm-dd), or `''`. */
  dateTo: string;
};

export type EventFilters = {
  values: EventFilterValues;
  setSource: (next: string) => void;
  setPublic: (next: string) => void;
  setDateFrom: (next: string) => void;
  setDateTo: (next: string) => void;
  /** Typed fragment to merge into the query's `EventAdminFilters`. */
  query: Pick<EventAdminFilters, 'source' | 'isPublic' | 'dateFrom' | 'dateTo'>;
  /** True when any of source / public / date is narrowing the list. */
  isActive: boolean;
  reset: () => void;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Owns the Events list' attribute filters — source, public flag and an
 * event-date range — mirrored into the URL so a filtered view is refresh-safe
 * and shareable. Invalid or hand-edited params degrade to "any" rather than
 * querying an impossible value.
 *
 * `onChange` fires after every change — pass a page reset so filtering starts
 * on page 1 instead of a page that may no longer exist.
 */
export function useEventFilters(opts?: { onChange?: () => void }): EventFilters {
  const { onChange } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSource = searchParams.get(SOURCE_PARAM) ?? '';
  const source = isValidSource(rawSource) ? rawSource : '';
  const rawPublic = searchParams.get(PUBLIC_PARAM) ?? '';
  const isPublic = isValidPublic(rawPublic) ? rawPublic : '';
  const rawFrom = searchParams.get(FROM_PARAM) ?? '';
  const dateFrom = ISO_DATE_RE.test(rawFrom) ? rawFrom : '';
  const rawTo = searchParams.get(TO_PARAM) ?? '';
  const dateTo = ISO_DATE_RE.test(rawTo) ? rawTo : '';

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          // Rebuild from `prev` so unrelated params (search, status) survive.
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
      onChange?.();
    },
    [setSearchParams, onChange],
  );

  const setSource = useCallback((next: string) => setParam(SOURCE_PARAM, next), [setParam]);
  const setPublic = useCallback((next: string) => setParam(PUBLIC_PARAM, next), [setParam]);
  const setDateFrom = useCallback((next: string) => setParam(FROM_PARAM, next), [setParam]);
  const setDateTo = useCallback((next: string) => setParam(TO_PARAM, next), [setParam]);

  const reset = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        [SOURCE_PARAM, PUBLIC_PARAM, FROM_PARAM, TO_PARAM].forEach((k) => next.delete(k));
        return next;
      },
      { replace: true },
    );
    onChange?.();
  }, [setSearchParams, onChange]);

  const query = useMemo(
    () => ({
      source: source || undefined,
      isPublic: isPublic === '' ? undefined : isPublic === 'true',
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [source, isPublic, dateFrom, dateTo],
  );

  return {
    values: { source, isPublic, dateFrom, dateTo },
    setSource,
    setPublic,
    setDateFrom,
    setDateTo,
    query,
    isActive: Boolean(source || isPublic || dateFrom || dateTo),
    reset,
  };
}

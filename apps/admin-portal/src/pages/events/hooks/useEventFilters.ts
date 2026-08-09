import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IsoDateRange } from '@sinnapi/ui';
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
  /** The event-date range, written to both URL params at once. */
  setDateRange: (next: IsoDateRange) => void;
  /** The same two params, shaped for the range picker. */
  dateRange: IsoDateRange;
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

  /**
   * Both ends land in one history entry. Two `setParam` calls would push an
   * intermediate URL pairing the new start with the old end — a state the list
   * would query, and the back button would return to.
   */
  const setDateRange = useCallback(
    (next: IsoDateRange) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.from) params.set(FROM_PARAM, next.from);
          else params.delete(FROM_PARAM);
          if (next.to) params.set(TO_PARAM, next.to);
          else params.delete(TO_PARAM);
          return params;
        },
        { replace: true },
      );
      onChange?.();
    },
    [setSearchParams, onChange],
  );

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

  const dateRange = useMemo<IsoDateRange>(
    () => ({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo],
  );

  return {
    values: { source, isPublic, dateFrom, dateTo },
    setSource,
    setPublic,
    setDateRange,
    dateRange,
    query,
    isActive: Boolean(source || isPublic || dateFrom || dateTo),
    reset,
  };
}

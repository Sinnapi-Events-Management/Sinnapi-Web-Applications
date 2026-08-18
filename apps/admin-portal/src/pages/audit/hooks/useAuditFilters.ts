import { useMemo, useState } from 'react';
import type { IsoDateRange } from '@sinnapi/ui';
import type { PageFilters } from '@sinnapi/ui';

/** Raw control values bound to the toolbar inputs. Empty string = "any". */
export type AuditFilterValues = {
  op: string;
  entity_type: string;
  actor: string;
  /** `yyyy-mm-dd`, the inclusive lower bound of the date range. */
  from: string;
  to: string;
};

const EMPTY: AuditFilterValues = { op: '', entity_type: '', actor: '', from: '', to: '' };

export type AuditFiltersApi = {
  values: AuditFilterValues;
  set: (key: keyof AuditFilterValues, value: string) => void;
  /** Both ends of the date range in one write — see `setRange`. */
  setRange: (range: IsoDateRange) => void;
  /** The range as the picker wants it. */
  range: IsoDateRange;
  reset: () => void;
  /** Server-side filter payload for the audit query. */
  filters: PageFilters;
  /** How many filters are currently applied (drives the "Clear" affordance). */
  activeCount: number;
};

/**
 * Owns the audit list's filter state and derives the query payload. Date inputs
 * are widened to full-day UTC bounds so a single day includes every entry in it.
 * `onChange` lets the caller reset pagination whenever a filter changes.
 */
export function useAuditFilters(onChange?: () => void): AuditFiltersApi {
  const [values, setValues] = useState<AuditFilterValues>(EMPTY);

  function set(key: keyof AuditFilterValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    onChange?.();
  }

  /**
   * The range picker hands back both ends together. Writing them in one update
   * matters: two `set` calls would re-query on the intermediate state, where the
   * new start is paired with the *old* end — briefly an inverted range.
   */
  function setRange(range: IsoDateRange) {
    setValues((prev) => ({ ...prev, from: range.from, to: range.to }));
    onChange?.();
  }

  function reset() {
    setValues(EMPTY);
    onChange?.();
  }

  const filters: PageFilters = useMemo(
    () => ({
      op: values.op || undefined,
      entity_type: values.entity_type || undefined,
      actor: values.actor || undefined,
      from: values.from ? new Date(`${values.from}T00:00:00`).toISOString() : undefined,
      to: values.to ? new Date(`${values.to}T23:59:59.999`).toISOString() : undefined,
    }),
    [values],
  );

  // A range counts once, not twice: it is one control on the toolbar, so
  // "Clear filters (2)" for a single date span would misdescribe the screen.
  const activeCount = useMemo(() => {
    const { from, to, ...rest } = values;
    return Object.values(rest).filter(Boolean).length + (from || to ? 1 : 0);
  }, [values]);

  const range = useMemo<IsoDateRange>(
    () => ({ from: values.from, to: values.to }),
    [values.from, values.to],
  );

  return { values, set, setRange, range, reset, filters, activeCount };
}

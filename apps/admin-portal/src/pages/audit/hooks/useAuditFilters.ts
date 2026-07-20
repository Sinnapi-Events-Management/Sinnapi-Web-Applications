import { useMemo, useState } from 'react';
import type { PageFilters } from '@/lib/table';

/** Raw control values bound to the toolbar inputs. Empty string = "any". */
export type AuditFilterValues = {
  op: string;
  entity_type: string;
  actor: string;
  /** `yyyy-mm-dd` from a date input. */
  from: string;
  to: string;
};

const EMPTY: AuditFilterValues = { op: '', entity_type: '', actor: '', from: '', to: '' };

export type AuditFiltersApi = {
  values: AuditFilterValues;
  set: (key: keyof AuditFilterValues, value: string) => void;
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

  const activeCount = useMemo(() => Object.values(values).filter(Boolean).length, [values]);

  return { values, set, reset, filters, activeCount };
}

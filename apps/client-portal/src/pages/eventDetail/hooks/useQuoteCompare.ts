import { useCallback, useMemo, useState } from 'react';
import { useQuoteComparison } from '@/hooks/queries';
import type { EventVendorModel } from '@/lib/types';

/** Three columns. See the comment on `toggle` for why this is the cap. */
export const MAX_COMPARE = 3;

/**
 * Choosing quotes to compare, and reading the comparison.
 *
 * THE CAP IS THREE, and it is a usability limit rather than a technical one.
 * Comparison tools are consistently found to break down past about three
 * columns — the reader stops comparing and starts scrolling — and the research
 * behind this screen goes further, noting that two at a time is where people
 * actually succeed. Three leaves room for the common "cheap / mid / premium"
 * spread without letting the grid become a spreadsheet.
 *
 * Selection is by QUOTATION, not by vendor: one vendor may have quoted for two
 * lines of this event, and those are two different offers.
 *
 * Nothing here blocks comparing quotes from different budget lines. It is
 * usually a mistake — a caterer and a photographer have no comparable total —
 * but it is occasionally exactly what a client wants ("can I afford both?"),
 * and the dialog says which line each column belongs to rather than refusing.
 */
export function useQuoteCompare(eventId: string) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback((quotationId: string) => {
    setSelected((prev) =>
      prev.includes(quotationId)
        ? prev.filter((id) => id !== quotationId)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, quotationId],
    );
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setIsOpen(false);
  }, []);

  const query = useQuoteComparison(eventId, selected);

  return {
    selected,
    isSelected: useCallback((id: string | null) => !!id && selected.includes(id), [selected]),
    /** True once the cap is reached — the cards disable their unticked boxes. */
    isFull: selected.length >= MAX_COMPARE,
    canCompare: selected.length >= 2,
    toggle,
    clear,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    rows: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Whether a set of engagements can be compared at all.
 *
 * Two or more quotes have to exist before the board offers selection — a
 * comparison affordance on a page with one quote is a control that can never do
 * anything, and hiding it until it can is cheaper than explaining it.
 */
export function hasComparableQuotes(rows: EventVendorModel[]): boolean {
  return rows.filter((r) => r.quotation_id && (r.quotation_total ?? 0) > 0).length >= 2;
}

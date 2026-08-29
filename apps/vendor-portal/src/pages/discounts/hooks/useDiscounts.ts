import { useCallback, useMemo, useState } from 'react';
import { useNow } from '@sinnapi/ui';
import {
  useDiscounts as useDiscountsQuery,
  usePromotions as usePromotionsQuery,
} from '@/hooks/queries';
import {
  matchesDiscountTerm,
  toDiscountCounts,
  toDiscountKpis,
  toDiscountRows,
  type DiscountFilter,
  type DiscountRow,
} from '../schema';

/**
 * The code list, what it is measuring, and the editor state around it.
 *
 * Two reads are joined here rather than in a card, so a card is handed a row
 * and renders it. A card that fetched its own campaign would issue one query
 * per code, and the same read backs the editor's attach picker — one list of
 * campaigns for the screen, whichever surface is asking.
 *
 * Every derived state runs off one `now`, ticked by `useNow`. A code whose last
 * day passes while the tab is open flips from Live to Ended on its own rather
 * than lying until someone reloads — which is the whole reason status is
 * derived here instead of read off `is_active`.
 *
 * Filter and search are separate inputs over the same rows, applied in that
 * order: the tabs answer "what state", the term answers "which one". Counts
 * stay on the *unsearched* rows, so typing narrows the grid without rewriting
 * the badges under the vendor's cursor.
 *
 * `editing` holds the code rather than its id so the dialog can seed its form
 * synchronously from data the list already has; fetching it again on open would
 * put a spinner in front of a form the browser could already draw.
 */
export function useDiscounts(vendorId: string) {
  const discounts = useDiscountsQuery(vendorId);
  const promotions = usePromotionsQuery(vendorId);
  // Hourly: every boundary on this screen is a calendar day, so a minute tick
  // would re-render the grid sixty times for nothing.
  const now = useNow(3_600_000);

  const [filter, setFilter] = useState<DiscountFilter>('all');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);

  const rows = useMemo(
    () => toDiscountRows(discounts.data ?? [], promotions.data ?? [], now),
    [discounts.data, promotions.data, now],
  );

  const visible = useMemo(
    () =>
      rows.filter(
        (row) => (filter === 'all' || row.status === filter) && matchesDiscountTerm(row, term),
      ),
    [rows, filter, term],
  );

  const counts = useMemo(() => toDiscountCounts(rows), [rows]);
  const kpis = useMemo(() => toDiscountKpis(rows), [rows]);

  /** The vendor's live code strings, so a duplicate can pick a free one. */
  const takenCodes = useMemo(
    () => rows.map((row) => row.code).filter((code): code is string => Boolean(code)),
    [rows],
  );

  const create = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const edit = useCallback((discount: DiscountRow) => {
    setEditing(discount);
    setEditorOpen(true);
  }, []);

  // Cleared on close as well as on open, so a re-open before the next render
  // cannot flash the previous code's values.
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
  }, []);

  const clearTerm = useCallback(() => setTerm(''), []);

  return {
    rows,
    visible,
    counts,
    kpis,
    filter,
    setFilter,
    term,
    setTerm,
    clearTerm,
    takenCodes,
    /** The campaigns the editor can attach a code to. */
    promotions: promotions.data ?? [],
    /** The clock every derived state on this screen was resolved against. */
    now,
    // Only the codes gate the screen. A failed or slow campaigns read costs a
    // card its "part of" line and the editor its picker, neither of which is
    // worth blanking a page whose subject is the codes.
    isLoading: discounts.isLoading,
    error: discounts.error,
    isEmpty: rows.length === 0,
    /** True when the vendor has codes but none survive the tab and the term. */
    isFiltered: rows.length > 0 && visible.length === 0,
    editing,
    isEditorOpen,
    create,
    edit,
    closeEditor,
  };
}

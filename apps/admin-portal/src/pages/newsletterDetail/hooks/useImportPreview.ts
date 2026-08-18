import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContactImportResult } from './useContactImport';

export type ImportPreviewTab = 'accepted' | 'skipped';

/**
 * Fixed page size.
 *
 * This is a proof sheet, not a report: the operator is checking that the file
 * was read the way they meant, and a rows-per-page control here only adds a way
 * to lose your place halfway through unticking people. Same reasoning, and the
 * same number, as the address-book picker.
 */
const PAGE_SIZE = 25;

export type ImportPreviewApi = ReturnType<typeof useImportPreview>;

/**
 * Which half of the parse the operator is looking at, and where in it.
 *
 * Purely where-am-I state — no contact ever changes here. It is a hook rather
 * than three `useState` calls in the preview organism so that the two rules
 * that make paging behave stay next to the state they govern:
 *
 *   a new file resets both the tab and the page, because page 7 of the last
 *   spreadsheet is a meaningless position in this one;
 *
 *   changing tab returns to page 1, because 380 accepted rows and 18 skipped
 *   ones do not share a page 4.
 */
export function useImportPreview(result: ContactImportResult | null) {
  const [tab, setTab] = useState<ImportPreviewTab>('accepted');
  const [page, setPage] = useState(0);

  // Keyed on the result object: every parse produces a new one, and nothing
  // else replaces it.
  useEffect(() => {
    setTab('accepted');
    setPage(0);
  }, [result]);

  const selectTab = useCallback((next: ImportPreviewTab) => {
    setTab(next);
    setPage(0);
  }, []);

  const accepted = useMemo(() => result?.accepted ?? [], [result]);
  const rejected = useMemo(() => result?.rejected ?? [], [result]);

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  return {
    tab,
    selectTab,
    page,
    setPage,
    pageSize: PAGE_SIZE,

    acceptedCount: accepted.length,
    rejectedCount: rejected.length,

    /** The rows on the current page. Only the active tab's slice is rendered. */
    acceptedPage: useMemo(() => accepted.slice(start, end), [accepted, start, end]),
    rejectedPage: useMemo(() => rejected.slice(start, end), [rejected, start, end]),
  };
}

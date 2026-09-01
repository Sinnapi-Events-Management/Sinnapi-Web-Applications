import { useCallback, useMemo, useState } from 'react';
import {
  filterReviewRows,
  sortReviewRows,
  type ReplyFilter,
  type ReviewRow,
  type ReviewSort,
  type StarFilter,
} from '../schema';

/**
 * The three controls over the list, and the rows that survive them.
 *
 * Kept apart from `useReviews` so that typing in the search box re-runs a
 * filter over rows already in memory instead of re-deriving the score, the
 * distribution and the tab counts on every keystroke.
 *
 * Filter first, sort second, always in that order: sorting the full set and
 * then discarding most of it is the same answer for more work, and doing it the
 * other way round is what keeps "Lowest rated" meaning *lowest of what I am
 * looking at* rather than lowest overall.
 *
 * Clearing is offered as one action rather than three. A vendor who has
 * narrowed to 2★ reviews mentioning "late", still owed a reply, and found
 * nothing, wants the whole list back — not to reason about which of three
 * controls is the one hiding it.
 */
export function useReviewFilters(rows: ReviewRow[]) {
  const [reply, setReply] = useState<ReplyFilter>('all');
  const [star, setStar] = useState<StarFilter>(0);
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<ReviewSort>('newest');

  const visible = useMemo(
    () => sortReviewRows(filterReviewRows(rows, { reply, star, term }), sort),
    [rows, reply, star, term, sort],
  );

  /** Clicking the score already selected clears it, so the bars toggle. */
  const toggleStar = useCallback(
    (next: StarFilter) => setStar((current) => (current === next ? 0 : next)),
    [],
  );

  const clearTerm = useCallback(() => setTerm(''), []);

  const clearAll = useCallback(() => {
    setReply('all');
    setStar(0);
    setTerm('');
  }, []);

  const isNarrowed = reply !== 'all' || star !== 0 || term.trim() !== '';

  return {
    visible,
    reply,
    setReply,
    star,
    toggleStar,
    term,
    setTerm,
    clearTerm,
    sort,
    setSort,
    /** True when any of the three axes is holding rows back. */
    isNarrowed,
    /** True when the vendor has reviews but none answer the current narrowing. */
    isFilteredEmpty: rows.length > 0 && visible.length === 0,
    clearAll,
  };
}

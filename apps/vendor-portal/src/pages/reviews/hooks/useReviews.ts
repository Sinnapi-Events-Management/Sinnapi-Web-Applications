import { useMemo } from 'react';
import { useNow } from '@sinnapi/ui';
import { useProfileDirectory, useVendorReviews } from '@/hooks/queries';
import {
  toAverageRating,
  toRatingBands,
  toReplyCounts,
  toReviewKpis,
  toReviewRows,
} from '../schema';

/**
 * Every review this vendor has, joined to its author and measured.
 *
 * A review carries only its author's id — RLS keeps the profile row out of the
 * embed — so the names for the whole page come back in one directory call
 * rather than one per card. Every reviewer has a completed booking with this
 * vendor, so all of them resolve.
 *
 * The directory is deliberately *not* part of the loading gate. A card whose
 * reviewer is still resolving reads "Client" for a moment; blanking the entire
 * page until a secondary read lands would hide the reviews, which are the whole
 * point of the screen, behind the names, which are the garnish.
 *
 * Everything derived — the score, the distribution, the tab counts, the KPI
 * row — is computed here from rows the page already holds, so no figure on this
 * screen can disagree with the list under it, and none of them costs a request.
 *
 * `now` ticks hourly rather than by the minute: the only clock-sensitive figure
 * is a 30-day window, and a minute tick would re-derive four metrics sixty
 * times an hour to move nothing.
 */
export function useReviews(vendorId: string) {
  const { data, isLoading, error } = useVendorReviews(vendorId);
  const reviews = useMemo(() => data ?? [], [data]);

  const { profiles } = useProfileDirectory(reviews.map((review) => review.client_id));
  const now = useNow(3_600_000);

  const rows = useMemo(() => toReviewRows(reviews, profiles), [reviews, profiles]);

  const kpis = useMemo(() => toReviewKpis(rows, now), [rows, now]);
  const bands = useMemo(() => toRatingBands(rows), [rows]);
  const counts = useMemo(() => toReplyCounts(rows), [rows]);

  const average = useMemo(() => toAverageRating(rows), [rows]);
  const publishedCount = useMemo(() => rows.filter((row) => row.isPublic).length, [rows]);

  return {
    rows,
    /** The four figures above the list. */
    kpis,
    /** The five scores, highest first, for the breakdown card. */
    bands,
    /** How many reviews sit under each reply tab. */
    counts,
    /** The score on the public profile, over published reviews only. */
    average,
    /** How many reviews clients can actually see — the denominator of `average`. */
    publishedCount,
    isLoading,
    error,
    /** True when this vendor has never been reviewed — not merely filtered to nothing. */
    isEmpty: !isLoading && !error && rows.length === 0,
  };
}

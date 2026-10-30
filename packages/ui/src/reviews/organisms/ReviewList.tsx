'use client';
import { useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { ReviewListItem } from '../molecules/ReviewListItem';
import type { VendorReview } from '../types';

export type ReviewListProps = {
  reviews: VendorReview[];
  vendorName?: string | null;
  /** Shown while the first page is in flight. */
  isLoading?: boolean;
  /** Present when more rows exist than are shown. */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /**
   * The reading client's own review, pulled to the top of the list and given
   * the edit button. `null` for a visitor, or for a client who has not rated.
   */
  myReviewId?: string | null;
  /** Whether that review may still be changed — the vendor has not replied. */
  canEditMine?: boolean;
  /** Opens the composer on the client's own review. */
  onEditMine?: () => void;
  /**
   * The client's own review when it is not in the loaded pages. The list is
   * newest-first and paged ten at a time, so on a vendor with four hundred
   * reviews the client's own could be four pages down — and the edit button
   * with it. Passed from the eligibility read, which always has that one row.
   */
  myReviewFallback?: VendorReview | null;
};

/**
 * The written reviews on a vendor's profile — and, first in the list, the
 * reading client's own.
 *
 * WHY THE LIST IS THE WHOLE TAB NOW. It used to be the third thing on it,
 * under a score card and a panel of eligibility prose, which is the complaint
 * this rework answers: clients opened a tab called Reviews and had to scroll
 * past two cards of our explanations to reach one. The score is one line above
 * these rows now, and the client's own review is a row in them rather than a
 * second copy above them.
 *
 * WHY THE OWN REVIEW IS PINNED RATHER THAN LEFT WHERE IT FALLS. It carries the
 * edit control, and a control that only appears once the client has paged to
 * the right ten rows is a control they will not find. `myReviewFallback` covers
 * the case where it is not in the loaded pages at all.
 *
 * The count is not printed as a caption any more. It is in the score line above
 * and in the "Show N more" button below, where it is doing something for the
 * reader rather than being another line to read.
 */
export function ReviewList({
  reviews,
  vendorName,
  isLoading = false,
  onLoadMore,
  isLoadingMore = false,
  myReviewId,
  canEditMine = false,
  onEditMine,
  myReviewFallback,
}: ReviewListProps) {
  // Pinned here rather than by the caller: the fallback has to be de-duplicated
  // against the fetched pages, and the page it finally arrives on would
  // otherwise render the client's review twice.
  const { mine, others, total } = useMemo(() => {
    const fetchedMine = myReviewId ? reviews.find((r) => r.review_id === myReviewId) : undefined;
    const ownRow = fetchedMine ?? (myReviewId ? (myReviewFallback ?? undefined) : undefined);
    const rest = reviews.filter((r) => r.review_id !== myReviewId);
    const reported = reviews[0]?.total_count ?? myReviewFallback?.total_count ?? reviews.length;

    return {
      mine: ownRow,
      others: rest,
      // The fallback is a row the server has not sent in a page yet, so it is
      // added to the total the pages reported rather than counted twice.
      total: fetchedMine || !ownRow ? reported : reported + 1,
    };
  }, [reviews, myReviewId, myReviewFallback]);

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading…
      </Typography>
    );
  }

  if (!mine && others.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No ratings yet. The first client to work with this vendor can leave one.
      </Typography>
    );
  }

  const shown = others.length + (mine ? 1 : 0);
  const remaining = Math.max(total - shown, 0);

  return (
    <Stack spacing={1.5}>
      {mine && (
        <ReviewListItem
          key={mine.review_id}
          review={mine}
          vendorName={vendorName}
          isMine
          canEdit={canEditMine}
          onEdit={onEditMine}
        />
      )}

      {others.map((review) => (
        <ReviewListItem key={review.review_id} review={review} vendorName={vendorName} />
      ))}

      {onLoadMore && remaining > 0 && (
        <Button onClick={onLoadMore} disabled={isLoadingMore} sx={{ alignSelf: 'flex-start' }}>
          {isLoadingMore ? 'Loading…' : `Show ${remaining} more`}
        </Button>
      )}
    </Stack>
  );
}

import { useMemo } from 'react';
import { useBookingReview } from '@/hooks/queries';
import type { BookingReviewResponseRel } from '@/lib/types';

/**
 * The client's review of this booking, resolved into what the card shows.
 *
 * ONE ROW, BY BOOKING. Deliberately not the Reviews page's read filtered down:
 * that one is keyed by vendor and returns their whole history, which is the
 * right request for a triage list and the wrong one for a booking page. See
 * `useBookingReview` in the query layer.
 *
 * WHAT IT HAS TO DECIDE, AND WHY NONE OF IT BELONGS IN THE CARD:
 *   the live reply   `review_responses` is selected rather than filtered,
 *                    because PostgREST applies a filter on an embedded column
 *                    to the parent row — filtering there would drop the whole
 *                    review the moment a reply was withdrawn. The withdrawn
 *                    row is skipped here instead
 *   is it public     a review moderation has pulled is still readable by the
 *                    vendor (`reviews_public_read` admits `is_vendor_owner`),
 *                    and the vendor was notified when it arrived — so it has to
 *                    be shown, labelled, rather than silently missing
 *   is a reply owed  only for a published review. Chasing a reply to a review
 *                    no client can see is work that changes nothing
 *
 * A failed read returns nothing rather than breaking the page: the review is
 * context on a booking, and a booking whose payout trail a vendor came to read
 * must not be replaced by an error because a secondary read failed.
 */
export function useClientReview(bookingId: string | undefined) {
  const { data, isLoading, error } = useBookingReview(bookingId);

  const reply = useMemo(() => {
    const rows = data?.review_responses;
    const live = (Array.isArray(rows) ? rows : [rows])
      .filter((row): row is BookingReviewResponseRel => Boolean(row))
      // A reply the vendor withdrew leaves a soft-deleted row behind, and the
      // client's edit window reopens with it — so it is not their reply any
      // more and must not be rendered as one.
      .find((row) => !row.deleted_at && row.body?.trim());

    return live ?? null;
  }, [data?.review_responses]);

  const isPublic = data?.status === 'published';

  return {
    /** `null` when this booking has not been reviewed — the usual case. */
    review: data ?? null,
    hasReview: Boolean(data),
    isPublic,
    /** `reviews.status` when it is not `published`, for the one-line notice. */
    withheldStatus: data && !isPublic ? data.status : null,

    /** The vendor's live reply, or `null` while the review is unanswered. */
    reply: reply?.body ?? null,
    /** When they replied — the edit date if they have changed it since. */
    replyAt: reply?.edited_at ?? reply?.created_at ?? null,
    /**
     * A reply is owed. Published and unanswered only, which is the same rule
     * the Reviews page draws its warning rule from.
     */
    needsReply: isPublic && !reply,

    isLoading,
    error,
  };
}

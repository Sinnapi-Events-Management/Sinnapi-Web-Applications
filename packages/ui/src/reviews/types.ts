/**
 * The shapes the review kit renders.
 *
 * Mirrors the three reads in `20261026000001_review_unlock_and_integrity.sql`
 * one field per column, because that is where the eligibility rules and the
 * lock actually live. The kit never fetches any of it — see the barrel.
 */

/** `get_my_vendor_review_state.reason`: why a client may or may not review. */
export type ReviewEligibilityReason =
  /** A booking is eligible and unreviewed. The only `can_review = true` case. */
  | 'eligible'
  /** Reviewed already, and still editable — the vendor has not replied. */
  | 'already_reviewed'
  /** Reviewed, and the vendor's reply has closed the edit window. */
  | 'already_reviewed_locked'
  /** The booking exists but the vendor has not confirmed it yet. */
  | 'booking_not_confirmed'
  /** Confirmed, but the event has not been marked as under way. */
  | 'event_not_started'
  /** No booking with this vendor at all, so nothing to review. */
  | 'no_booking';

/** One published review with the vendor's reply — `get_vendor_reviews`. */
export type VendorReview = {
  review_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  /** Set when the author corrected it before the vendor replied. */
  edited_at: string | null;
  /** First name + last initial. The full name never leaves the server. */
  author_name: string | null;
  author_avatar: string | null;
  reply_body: string | null;
  reply_at: string | null;
  /** The unpaged total, repeated on every row so the count cannot disagree. */
  total_count: number;
};

/** One row of the client's own queue — `get_my_review_queue`. */
export type ReviewQueueRow = {
  booking_id: string;
  reference_no: string | null;
  booking_status: string;
  event_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  amount: number | null;
  currency: string | null;
  vendor_id: string;
  vendor_name: string | null;
  vendor_slug: string | null;
  vendor_image_url: string | null;
  event_id: string | null;
  event_title: string | null;
  /** `null` is what makes this row an outstanding one. */
  review_id: string | null;
  rating: number | null;
  review_title: string | null;
  review_body: string | null;
  review_status: string | null;
  review_created_at: string | null;
  review_edited_at: string | null;
  /** The vendor has replied, so the review is final. */
  is_locked: boolean;
  reply_body: string | null;
  reply_at: string | null;
};

/** Whether THIS client may review THIS vendor — `get_my_vendor_review_state`. */
export type VendorReviewState = {
  can_review: boolean;
  reason: ReviewEligibilityReason;
  booking_id: string | null;
  reference_no: string | null;
  booking_status: string | null;
  event_date: string | null;
  event_title: string | null;
  review_id: string | null;
  rating: number | null;
  review_title: string | null;
  review_body: string | null;
  /**
   * `reviews.status`. Optional because the RPC gained this column after it had
   * shipped without it: a client whose portal is talking to the older function
   * gets `undefined` here, and the callers read that as `published`, which is
   * what they assumed before the column existed.
   */
  review_status?: string | null;
  is_locked: boolean;
};

/** What the composer collects. The only three columns a client may write. */
export type ReviewDraft = {
  rating: number;
  title: string;
  body: string;
};

/**
 * The vocabulary the review list is worked along.
 *
 * Three separate axes rather than one merged "filter": a vendor asks "what do I
 * still owe a reply to", "what did the unhappy clients say" and "which review
 * was that" as different questions, and collapsing them into a single control
 * would make each of them harder to ask.
 */

/** Whether a review has been answered — the axis this page exists to work. */
export type ReplyFilter = 'all' | 'awaiting' | 'replied';

export const REPLY_FILTERS: { value: ReplyFilter; label: string }[] = [
  { value: 'all', label: 'All reviews' },
  { value: 'awaiting', label: 'Awaiting reply' },
  { value: 'replied', label: 'Replied' },
];

/** A single score to narrow to, or `0` for every score. */
export type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;

/** The five scores, highest first — the order a distribution is read in. */
export const STAR_SCORES = [5, 4, 3, 2, 1] as const;

export type ReviewSort = 'newest' | 'oldest' | 'lowest' | 'highest';

/**
 * "Lowest rated" sits above "Highest rated" on purpose. A vendor sorting by
 * score is almost always looking for the review that is costing them bookings,
 * not the one they already feel good about.
 */
export const REVIEW_SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'lowest', label: 'Lowest rated' },
  { value: 'highest', label: 'Highest rated' },
];

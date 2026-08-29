import { one } from '@/lib/rel';
import type { DirectoryProfile, ReviewModel, ReviewResponseRel } from '@/lib/types';
import type { ReplyFilter, ReviewSort, StarFilter } from './reviewFilters';

/**
 * Whether a review is one clients can actually see.
 *
 * Only `published` counts towards the vendor's standing. A review pulled for
 * moderation still belongs in the list — the vendor should know it exists, and
 * why their count moved — but folding it into the average would report a score
 * no client is being shown.
 */
export type ReviewVisibility = 'published' | 'pending' | 'hidden' | 'removed';

/** One review, flattened into everything a card needs and nothing it doesn't. */
export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  /** The reviewer as the directory resolved them, or the generic fallback. */
  reviewer: string;
  avatarUrl: string | null;
  /** The vendor's published reply, or `null` while the review is unanswered. */
  reply: string | null;
  visibility: ReviewVisibility;
  /** True only for a published review — the ones carrying the public score. */
  isPublic: boolean;
};

const VISIBILITIES: readonly string[] = ['published', 'pending', 'hidden', 'removed'];

function toVisibility(status: string): ReviewVisibility {
  return VISIBILITIES.includes(status) ? (status as ReviewVisibility) : 'published';
}

/**
 * Joins each review to its author and its reply.
 *
 * The name is resolved from a directory map built once for the whole page
 * rather than looked up per card: RLS keeps the profile row out of the embed,
 * so a card that fetched its own reviewer would issue one request per review.
 *
 * A reviewer the directory could not resolve reads as "Client" rather than
 * blank — every reviewer has a completed booking with this vendor, so that is
 * a slow directory rather than a stranger, and a nameless card is worse than a
 * generic one.
 */
export function toReviewRows(
  reviews: ReviewModel[],
  profiles: Record<string, DirectoryProfile>,
): ReviewRow[] {
  return reviews.map((review) => {
    const profile = review.client_id ? profiles[review.client_id] : undefined;
    const response = one<ReviewResponseRel>(review.review_responses);
    const visibility = toVisibility(review.status);

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: review.created_at,
      reviewer: profile?.full_name || 'Client',
      avatarUrl: profile?.avatar_url ?? null,
      // An empty body is not a reply: the row can exist with nothing in it, and
      // a card headed "Your response" above blank space would tell the vendor
      // they had answered when they hadn't.
      reply: response?.body?.trim() ? response.body : null,
      visibility,
      isPublic: visibility === 'published',
    };
  });
}

/**
 * Whether a review answers the toolbar's search term.
 *
 * Matched against the reviewer, the headline and the body — the three things a
 * vendor remembers a review by. Their own reply is deliberately not searched:
 * they wrote it, and matching on it would surface reviews whose text has
 * nothing to do with what was typed.
 */
export function matchesReviewTerm(row: ReviewRow, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  return [row.reviewer, row.title ?? '', row.body ?? ''].join(' ').toLowerCase().includes(needle);
}

export type ReviewQuery = {
  reply: ReplyFilter;
  star: StarFilter;
  term: string;
};

/** The three axes applied together, in the browser — none of them costs a request. */
export function filterReviewRows(rows: ReviewRow[], query: ReviewQuery): ReviewRow[] {
  return rows.filter((row) => {
    if (query.reply === 'awaiting' && row.reply !== null) return false;
    if (query.reply === 'replied' && row.reply === null) return false;
    if (query.star !== 0 && row.rating !== query.star) return false;
    return matchesReviewTerm(row, query.term);
  });
}

/**
 * Sorts a copy, never the input.
 *
 * Score ties fall back to recency so the order is total: two 5★ reviews would
 * otherwise sit in whatever order the previous sort left them, and a list that
 * reshuffles under an unchanged control reads as a bug.
 */
export function sortReviewRows(rows: ReviewRow[], sort: ReviewSort): ReviewRow[] {
  const newestFirst = (a: ReviewRow, b: ReviewRow) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  return [...rows].sort((a, b) => {
    if (sort === 'newest') return newestFirst(a, b);
    if (sort === 'oldest') return -newestFirst(a, b);
    if (sort === 'lowest') return a.rating - b.rating || newestFirst(a, b);
    return b.rating - a.rating || newestFirst(a, b);
  });
}

/**
 * How many reviews sit under each reply tab.
 *
 * Counted on every row rather than on the searched set, so typing narrows the
 * list without rewriting the badges under the vendor's cursor — and so the
 * "Awaiting reply" tab always agrees with the figure in the KPI row above it.
 */
export function toReplyCounts(rows: ReviewRow[]): Record<ReplyFilter, number> {
  const replied = rows.reduce((total, row) => total + (row.reply ? 1 : 0), 0);
  return { all: rows.length, awaiting: rows.length - replied, replied };
}

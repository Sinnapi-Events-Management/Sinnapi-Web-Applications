import type { Kpi } from '@sinnapi/ui/analytics';
import type { ReviewRow } from './reviewRows';
import { STAR_SCORES } from './reviewFilters';

/** Reviews newer than this are "recent" in the KPI row. */
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** One score in the distribution, with its share of the published total. */
export type RatingBand = {
  star: number;
  count: number;
  /** `0`–`1` of the published reviews, for the bar's width. */
  share: number;
};

/**
 * The score a client sees on the public profile.
 *
 * Averaged over published reviews only. A review sitting in moderation is not
 * on the profile, so counting it here would put a number on this page that the
 * vendor could not find anywhere a client looks.
 */
export function toAverageRating(rows: ReviewRow[]): number {
  const published = rows.filter((row) => row.isPublic);
  if (published.length === 0) return 0;

  const total = published.reduce((sum, row) => sum + row.rating, 0);
  return total / published.length;
}

/**
 * The five scores, highest first, always all five.
 *
 * A score nobody has given still gets its row: the gap between "no 1★ reviews"
 * and "1★ not shown" is the whole point of a distribution, and dropping empty
 * bands would also make the chart change height as reviews arrive.
 */
export function toRatingBands(rows: ReviewRow[]): RatingBand[] {
  const published = rows.filter((row) => row.isPublic);
  const counts = new Map<number, number>(STAR_SCORES.map((star) => [star, 0]));
  for (const row of published) counts.set(row.rating, (counts.get(row.rating) ?? 0) + 1);

  return STAR_SCORES.map((star) => {
    const count = counts.get(star) ?? 0;
    return { star, count, share: published.length ? count / published.length : 0 };
  });
}

/**
 * The four figures above the list.
 *
 * The average is *not* one of them: `KpiTile` rounds a `number` to the nearest
 * integer, which would print a hard-won 4.6 as "5" and a struggling 3.4 as "3".
 * It gets the display treatment on the breakdown card instead, where the
 * decimal survives and the star row can sit under it.
 *
 * Reply rate earns a tile over a second raw count because it is the one figure
 * here a vendor is graded on rather than dealt: the review count is whatever
 * clients decided to leave, but every unanswered review is a choice, and a
 * percentage is what makes "3 waiting" read as either fine or a problem.
 *
 * Deltas are all null — nothing here is a period total, so there is no previous
 * period to compare against, and inventing one would put a coloured arrow next
 * to a number that did not move.
 */
export function toReviewKpis(rows: ReviewRow[], now: number): Kpi[] {
  const published = rows.filter((row) => row.isPublic);
  const replied = rows.filter((row) => row.reply !== null).length;
  const awaiting = rows.length - replied;
  const recent = rows.filter(
    (row) => now - new Date(row.createdAt).getTime() <= RECENT_WINDOW_MS,
  ).length;

  return [
    {
      key: 'published',
      label: 'Published reviews',
      value: published.length,
      format: 'number',
      delta: null,
    },
    {
      key: 'awaiting',
      label: 'Awaiting your reply',
      value: awaiting,
      format: 'number',
      delta: null,
    },
    {
      key: 'replyRate',
      label: 'Reply rate',
      value: rows.length ? replied / rows.length : 0,
      format: 'percent',
      delta: null,
    },
    { key: 'recent', label: 'New in 30 days', value: recent, format: 'number', delta: null },
  ];
}

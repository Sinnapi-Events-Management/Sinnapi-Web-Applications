import type { StatusTabOption } from '@sinnapi/ui';
import type { MediaModel } from '@/lib/types';

/** The grid's filter. `all` is the default because a portfolio is one body of work. */
export const MEDIA_FILTERS = ['all', 'image', 'video'] as const;
export type MediaFilter = (typeof MEDIA_FILTERS)[number];

export type MediaCounts = { all: number; image: number; video: number };

export function countMedia(rows: MediaModel[]): MediaCounts {
  return rows.reduce<MediaCounts>(
    (counts, row) => {
      counts.all += 1;
      if (row.media_type === 'video') counts.video += 1;
      else counts.image += 1;
      return counts;
    },
    { all: 0, image: 0, video: 0 },
  );
}

export function filterMedia(rows: MediaModel[], filter: MediaFilter): MediaModel[] {
  if (filter === 'all') return rows;
  if (filter === 'video') return rows.filter((row) => row.media_type === 'video');
  return rows.filter((row) => row.media_type !== 'video');
}

/**
 * Tabs for the filter bar.
 *
 * The type tabs appear only once the vendor actually has both kinds: a portfolio
 * of nine photos and no clips gains nothing from a "Videos 0" tab, and offering
 * an empty filter reads as something being broken.
 */
export function mediaFilterOptions(counts: MediaCounts): StatusTabOption<MediaFilter>[] {
  const options: StatusTabOption<MediaFilter>[] = [
    { value: 'all', label: 'All', count: counts.all },
  ];
  if (counts.image > 0 && counts.video > 0) {
    options.push(
      { value: 'image', label: 'Photos', count: counts.image },
      { value: 'video', label: 'Videos', count: counts.video },
    );
  }
  return options;
}

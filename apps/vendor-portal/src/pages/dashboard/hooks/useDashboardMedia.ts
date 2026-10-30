import { useMemo } from 'react';
import { toPlayableMedia, type PlayableMedia } from '@sinnapi/ui/media';
import { useMedia } from '@/hooks/queries';
import type { MediaModel } from '@/lib/types';

/** Thumbnails shown on the dashboard card; the rest are summarised as "+N more". */
export const SHOWCASE_THUMBS = 5;

/**
 * Below this a listing still looks unfinished to a client, so the card keeps
 * nudging even though the gallery is no longer empty. Three is the point at
 * which a strip of thumbnails reads as a body of work rather than a test upload.
 */
export const HEALTHY_MEDIA_COUNT = 3;

/** Stable identity, so an empty gallery doesn't re-derive the model each render. */
const NO_ROWS: MediaModel[] = [];

export type DashboardMedia = {
  loading: boolean;
  /** Every row on the public profile, renderable here or not. */
  total: number;
  photos: number;
  videos: number;
  /** The first few rows, already classified for rendering. */
  preview: PlayableMedia<MediaModel>[];
  /** Rows beyond the preview — what "+N more" counts. */
  hidden: number;
  isEmpty: boolean;
  /** Has something, but not yet enough to look established. */
  isThin: boolean;
};

/**
 * What the dashboard needs to know about the vendor's photos and videos.
 *
 * A separate read rather than a field on the overview RPC: this is a listing
 * fact, not a period metric, so it must not reload when the vendor changes the
 * dashboard's date range — and the gallery query is already in the cache under
 * `['v-media', vendorId]` for anyone who has opened the page, which makes the
 * card free on a second visit.
 *
 * Counts come from the raw rows, the strip from the classified ones: a row whose
 * URL this app cannot frame is still on the client's screen, so leaving it out of
 * the total would under-report the listing.
 */
export function useDashboardMedia(vendorId?: string): DashboardMedia {
  const { data, isLoading } = useMedia(vendorId);
  const rows = data ?? NO_ROWS;

  return useMemo(() => {
    const videos = rows.filter((row) => row.media_type === 'video').length;
    const preview = toPlayableMedia(rows).slice(0, SHOWCASE_THUMBS);

    return {
      // No vendor id means the query never ran, which is not a load in progress.
      loading: !!vendorId && isLoading,
      total: rows.length,
      photos: rows.length - videos,
      videos,
      preview,
      hidden: Math.max(0, rows.length - preview.length),
      isEmpty: rows.length === 0,
      isThin: rows.length > 0 && rows.length < HEALTHY_MEDIA_COUNT,
    };
  }, [rows, isLoading, vendorId]);
}

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useVendor, useVendorMedia } from '@/hooks/queries';
import { toPlayableMedia } from '../utils/mediaSource';

/**
 * Everything the vendor page reads.
 *
 * The portfolio is a second query rather than an embed on the vendor row: it
 * only becomes relevant once the vendor resolves, it is the heavier half of the
 * payload, and keeping it separate means a media failure leaves the profile,
 * pricing and booking actions intact. Its loading and error state stay out of
 * the page-level `isLoading`/`error` for the same reason — the gallery reports
 * its own.
 */
export function useVendorDetail() {
  const { slug = '' } = useParams();
  const { data: vendor, isLoading, error } = useVendor(slug);
  const {
    data: rawMedia,
    isLoading: isMediaLoading,
    error: mediaError,
  } = useVendorMedia(vendor?.id);

  // Resolved once here so the grid and the lightbox share one list, and so the
  // work isn't redone on every keystroke through the gallery.
  const media = useMemo(() => toPlayableMedia(rawMedia ?? []), [rawMedia]);

  // Names the last breadcrumb once the vendor resolves; until then the shell
  // shows its generic fallback rather than the raw slug.
  useBreadcrumbTitle(vendor?.business_name);

  return { vendor, isLoading, error, media, isMediaLoading, mediaError };
}

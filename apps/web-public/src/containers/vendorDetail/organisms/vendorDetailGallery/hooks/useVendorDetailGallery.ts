'use client';

import { useMemo } from 'react';
import { toPlayableMedia, useMediaViewer } from '@sinnapi/ui/media';
import type { VendorMediaModel } from '@/lib/types';

export function useVendorDetailGallery(media: VendorMediaModel[]) {
  const images = useMemo(
    () => toPlayableMedia(media.filter((item) => item.media_type === 'image' && item.url)),
    [media],
  );
  const viewer = useMediaViewer(images);

  return { images, viewer };
}

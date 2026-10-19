'use client';

import { useMemo } from 'react';
import { toPlayableMedia, useMediaViewer } from '@sinnapi/ui/media';
import type { VendorMediaModel } from '@/lib/types';

export function useVendorDetailGallery(media: VendorMediaModel[]) {
  const items = useMemo(() => toPlayableMedia(media.filter((item) => item.url)), [media]);
  const viewer = useMediaViewer(items);

  return { items, viewer };
}

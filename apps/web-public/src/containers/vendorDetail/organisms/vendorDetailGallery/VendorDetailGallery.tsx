import { Box, Typography, ImageList, ImageListItem } from '@sinnapi/ui';
import type { VendorMediaModel } from '@/lib/types';

/**
 * Portfolio gallery — a masonry grid of the vendor's work samples. Images lazy-
 * load and use a plain <img> (any URL works without remote-image config).
 * Renders nothing when the vendor has no image media, so the section stays clean.
 */
export default function VendorDetailGallery({
  media,
  vendorName,
}: {
  media: VendorMediaModel[];
  vendorName: string;
}) {
  const images = media.filter((m) => m.media_type === 'image' && m.url);
  if (images.length === 0) return null;

  return (
    <Box sx={{ mt: { xs: 4, md: 5 } }}>
      <Typography variant="overline" color="primary">
        Portfolio
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, mb: 2.5 }}>
        Recent work
      </Typography>
      <ImageList variant="masonry" cols={3} gap={10}>
        {images.map((m) => (
          <ImageListItem key={m.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.url!}
              alt={m.caption ?? vendorName}
              loading="lazy"
              style={{ borderRadius: 12, display: 'block', width: '100%' }}
            />
          </ImageListItem>
        ))}
      </ImageList>
    </Box>
  );
}

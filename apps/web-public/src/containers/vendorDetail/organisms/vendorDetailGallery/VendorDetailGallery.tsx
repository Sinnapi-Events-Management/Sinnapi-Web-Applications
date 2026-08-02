import { Box, Typography } from '@sinnapi/ui/atoms';
import { ImageList, ImageListItem } from '@sinnapi/ui/molecules';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { VendorMediaModel } from '@/lib/types';

/**
 * Portfolio gallery — a masonry grid of the vendor's work samples. Images lazy-
 * load and use a plain <img> (any URL works without remote-image config), fade
 * + lift into place as they scroll into view, and zoom slightly on hover to
 * invite a closer look. Renders nothing when the vendor has no image media, so
 * the section stays clean.
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
        {images.map((m, i) => (
          <ImageListItem key={m.id}>
            <ScrollReveal delay={(i % 9) * 60}>
              <Box
                sx={{
                  overflow: 'hidden',
                  borderRadius: '12px',
                  '& .portfolio-img': { transition: 'transform .5s ease' },
                  '&:hover .portfolio-img': { transform: 'scale(1.06)' },
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="portfolio-img"
                  src={m.url!}
                  alt={m.caption ?? vendorName}
                  loading="lazy"
                  style={{ borderRadius: 12, display: 'block', width: '100%' }}
                />
              </Box>
            </ScrollReveal>
          </ImageListItem>
        ))}
      </ImageList>
    </Box>
  );
}

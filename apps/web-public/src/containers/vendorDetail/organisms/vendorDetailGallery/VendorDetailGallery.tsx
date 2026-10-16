'use client';

import { Box, Paper, Typography } from '@sinnapi/ui/atoms';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import { MediaTile, MediaViewer } from '@sinnapi/ui/media';
import ScrollReveal from '@/components/atoms/scrollReveal';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import type { VendorMediaModel } from '@/lib/types';
import { useVendorDetailGallery } from './hooks/useVendorDetailGallery';

/**
 * Portfolio gallery — a masonry grid of the vendor's work.
 *
 * Images lazy-load, fade into place as they scroll into view, and open in the
 * shared full-screen viewer with keyboard and thumbnail navigation.
 *
 * It used to render nothing at all when a vendor had uploaded no images. Under
 * tabs that inverts: the tab is fixed, so nothing means a tab that opens onto
 * blank space, which reads as a page that failed rather than a vendor who
 * hasn't uploaded. The empty case now says which of the two it is.
 *
 * The masonry is a plain CSS multi-column box rather than MUI's `ImageList`,
 * which writes its `columnCount` as an inline style and so cannot be given a
 * responsive value. That matters here: three columns of a 360px screen is a
 * 110px thumbnail, too small to tell one reception hall from another.
 */
export default function VendorDetailGallery({
  media,
  vendorName,
}: {
  media: VendorMediaModel[];
  vendorName: string;
}) {
  const { images, viewer } = useVendorDetailGallery(media);

  return (
    <Box component="section">
      <VendorSectionHeading
        eyebrow="Portfolio"
        title="Recent work"
        subtitle={`Photos ${vendorName} has published from past events.`}
      />

      {images.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            borderStyle: 'dashed',
            textAlign: 'center',
            // Reads as a placeholder in both modes: a hair off the page in
            // light, a hair above it in dark, rather than a hard-coded grey.
            bgcolor: 'action.hover',
          }}
        >
          <PhotoLibraryOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1">No photos published yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {vendorName} hasn’t added a portfolio here. Sign in and message them to ask for recent
            work.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            columnCount: { xs: 2, md: 3 },
            columnGap: '10px',
          }}
        >
          {images.map((item, index) => (
            <Box key={item.id} sx={{ breakInside: 'avoid', mb: '10px' }}>
              <ScrollReveal delay={(index % 9) * 60}>
                <MediaTile
                  item={item}
                  fallbackAlt={vendorName}
                  onOpen={() => viewer.openAt(index)}
                />
              </ScrollReveal>
            </Box>
          ))}
        </Box>
      )}

      <MediaViewer
        items={images}
        item={viewer.active}
        index={viewer.index}
        position={viewer.position}
        count={viewer.count}
        fallbackAlt={vendorName}
        canStep={viewer.canStep}
        fullViewport
        onClose={viewer.close}
        onNext={viewer.next}
        onPrevious={viewer.previous}
        onSelect={viewer.goTo}
        onKeyDown={viewer.onKeyDown}
      />
    </Box>
  );
}

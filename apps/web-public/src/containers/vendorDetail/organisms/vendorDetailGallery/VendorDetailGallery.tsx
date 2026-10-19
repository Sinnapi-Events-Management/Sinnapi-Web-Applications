'use client';

import { Box, Paper, Typography } from '@sinnapi/ui/atoms';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import { MediaTile, MediaViewer } from '@sinnapi/ui/media';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import type { VendorMediaModel } from '@/lib/types';
import { useVendorDetailGallery } from './hooks/useVendorDetailGallery';

/**
 * An Instagram-inspired, square gallery of the vendor's photos and videos.
 *
 * Images and videos open in the shared full-screen viewer with keyboard and
 * thumbnail navigation. Tiles are visible immediately rather than waiting for
 * a scroll reveal, because this gallery is the first content on the page.
 *
 * Two columns on phones keep each thumbnail large enough to recognize; the
 * three-column desktop grid preserves the familiar social-profile rhythm.
 */
export default function VendorDetailGallery({
  media,
  vendorName,
}: {
  media: VendorMediaModel[];
  vendorName: string;
}) {
  const { items, viewer } = useVendorDetailGallery(media);

  return (
    <Box component="section">
      <VendorSectionHeading eyebrow="Gallery" title="Photos & videos" />

      {items.length === 0 ? (
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
          <Typography variant="subtitle1">No work samples published yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {vendorName} hasn’t added photos or videos here yet. Sign in and contact them to ask for
            recent work.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: { xs: 1, sm: 1.5, md: 2 },
          }}
        >
          {items.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                aspectRatio: '1 / 1',
                '& > div, & > div > button, & > div > button > div': { height: '100%' },
                '& .media-tile-visual': {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              }}
            >
              <MediaTile
                item={item}
                fallbackAlt={vendorName}
                onOpen={() => viewer.openAt(index)}
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            </Box>
          ))}
        </Box>
      )}

      <MediaViewer
        items={items}
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

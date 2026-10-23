'use client';

import { Box, Paper, Typography } from '@sinnapi/ui/atoms';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import { MediaTile, MediaViewer } from '@sinnapi/ui/media';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import type { VendorMediaModel } from '@/lib/types';
import { useVendorDetailGallery } from './hooks/useVendorDetailGallery';

/**
 * An Instagram-inspired, square gallery of the vendor's photos and videos —
 * the profile's first tab, and what the page opens on.
 *
 * Images and videos open in the shared full-screen viewer with keyboard and
 * thumbnail navigation. Tiles are visible immediately rather than waiting for
 * a scroll reveal, because this is still the first content a visitor sees.
 *
 * Two columns on phones keep each thumbnail large enough to recognize; the
 * three-column desktop grid preserves the familiar social-profile rhythm.
 *
 * Deliberately uncapped — no "show the first twelve" button. A vendor with
 * thirty photos is a vendor with thirty pieces of evidence, and hiding
 * two-thirds of them behind a tap would cost the one thing this section is
 * for. What made a long gallery painful was never its length but its
 * *position*: it used to sit above the tab bar, so every photo stood between
 * the visitor and the prices, the reviews and the quote button. Inside a tab,
 * under a bar that stays pinned to the top of the viewport, scrolling past it
 * is a choice rather than a toll.
 *
 * Length is paid for instead, not avoided: each tile reserves its square
 * through `aspectRatio` before anything loads, so a slow connection gets the
 * final layout immediately and nothing shifts under a thumb mid-scroll, and
 * only the first row is eager — the rest decode as they are approached.
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
                // The first row, which is three tiles at `md` and one and a
                // half on a phone. Everything past it is lazy; the square is
                // already reserved above, so a late arrival costs no reflow.
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

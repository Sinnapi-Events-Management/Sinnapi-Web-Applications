import { Box, Paper, Typography } from '@sinnapi/ui/atoms';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import ScrollReveal from '@/components/atoms/scrollReveal';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import type { VendorMediaModel } from '@/lib/types';

/**
 * Portfolio gallery — a masonry grid of the vendor's work.
 *
 * Images lazy-load and use a plain <img> (any URL works without remote-image
 * config), fade and lift into place as they scroll into view, and zoom slightly
 * on hover to invite a closer look.
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
  const images = media.filter((m) => m.media_type === 'image' && m.url);

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
          {images.map((m, i) => (
            <Box key={m.id} sx={{ breakInside: 'avoid', mb: '10px' }}>
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
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

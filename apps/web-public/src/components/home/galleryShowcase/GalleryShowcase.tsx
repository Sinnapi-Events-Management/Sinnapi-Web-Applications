import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Button } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/common/SectionHeading';
import { GALLERY_TILES } from './data/gallery';

export default function GalleryShowcase() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Inspiration"
        title="Inspiration for every celebration"
        subtitle="Real décor, fashion, cakes, and details from the trusted vendors you can book on Sinnapi."
      />

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gridAutoRows: { xs: 140, sm: 175, md: 210 },
          gridAutoFlow: 'dense',
        }}
      >
        {GALLERY_TILES.map((tile) => (
          <Box
            key={tile.title}
            component={NextLink}
            href={tile.href}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 3,
              textDecoration: 'none',
              gridColumn: { xs: `span ${Math.min(tile.span.c, 2)}`, md: `span ${tile.span.c}` },
              gridRow: `span ${tile.span.r}`,
              '& .gallery-img': { transition: 'transform .5s ease' },
              '&:hover .gallery-img': { transform: 'scale(1.06)' },
              '&:focus-visible': {
                outline: `3px solid ${palette.light.secondary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Image
              className="gallery-img"
              src={tile.image.src}
              alt={tile.image.alt}
              fill
              placeholder="blur"
              sizes={
                tile.span.c >= 2
                  ? '(max-width: 600px) 100vw, (max-width: 900px) 66vw, 50vw'
                  : '(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw'
              }
              style={{ objectFit: 'cover' }}
            />
            {/* Legibility scrim — darkest at the bottom where the labels sit. */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to top, ${withAlpha(palette.light.primary.dark, 0.85)} 0%, ${withAlpha(palette.light.primary.dark, 0.15)} 45%, transparent 75%)`,
              }}
            />
            <Box sx={{ position: 'absolute', left: 0, bottom: 0, p: { xs: 1.75, md: 2.5 } }}>
              <Typography
                variant="overline"
                sx={{ color: 'secondary.light', fontWeight: 700, lineHeight: 1.4 }}
              >
                {tile.eyebrow}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'common.white',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  textShadow: `0 1px 8px ${withAlpha(common.black, 0.4)}`,
                }}
              >
                {tile.title}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button component={NextLink} href="/vendors" variant="outlined" endIcon={<ArrowForward />}>
          Explore all vendors
        </Button>
      </Box>
    </Container>
  );
}

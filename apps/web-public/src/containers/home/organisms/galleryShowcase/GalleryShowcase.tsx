'use client';

import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Button } from '@sinnapi/ui/atoms';
import { ArrowForward } from '@mui/icons-material';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';
import { MediaViewer, useMediaViewer } from '@sinnapi/ui/media';
import SectionHeading from '@/components/molecules/sectionHeading';
import ScrollReveal from '@/components/atoms/scrollReveal';
import { GALLERY_TILES, GALLERY_VIEWER_ITEMS } from './data/gallery';

export default function GalleryShowcase() {
  const viewer = useMediaViewer(GALLERY_VIEWER_ITEMS);

  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Inspiration"
        title="Inspiration for every celebration and events"
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
        {GALLERY_TILES.map((tile, i) => (
          <ScrollReveal
            key={tile.title}
            delay={i * 60}
            sx={{
              gridColumn: { xs: `span ${Math.min(tile.span.c, 2)}`, md: `span ${tile.span.c}` },
              gridRow: `span ${tile.span.r}`,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                height: '100%',
                overflow: 'hidden',
                borderRadius: 3,
                '&:hover .gallery-img': { transform: 'scale(1.06)' },
                '&:focus-within .gallery-img': { transform: 'scale(1.06)' },
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => viewer.openAt(i)}
                aria-label={`View full-size image: ${tile.image.alt}`}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  p: 0,
                  border: 0,
                  cursor: 'zoom-in',
                  bgcolor: 'transparent',
                  '&:focus-visible': {
                    outline: `3px solid ${palette.light.secondary.main}`,
                    outlineOffset: -3,
                  },
                }}
              >
                <Image
                  className="gallery-img"
                  src={tile.image.src}
                  alt=""
                  fill
                  placeholder="blur"
                  sizes={
                    tile.span.c >= 2
                      ? '(max-width: 600px) 100vw, (max-width: 900px) 66vw, 50vw'
                      : '(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw'
                  }
                  style={{ objectFit: 'cover', transition: 'transform .5s ease' }}
                />
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(to top, ${withAlpha(palette.light.primary.dark, 0.85)} 0%, ${withAlpha(palette.light.primary.dark, 0.15)} 45%, transparent 75%)`,
                  }}
                />
              </Box>
              <Box
                component={NextLink}
                href={tile.href}
                sx={{
                  position: 'absolute',
                  zIndex: 1,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  p: { xs: 1.75, md: 2.5 },
                  textDecoration: 'none',
                  '&:focus-visible': {
                    outline: `3px solid ${palette.light.secondary.main}`,
                    outlineOffset: -3,
                  },
                }}
              >
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
          </ScrollReveal>
        ))}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button component={NextLink} href="/vendors" variant="outlined" endIcon={<ArrowForward />}>
          Explore all vendors
        </Button>
      </Box>

      <MediaViewer
        items={GALLERY_VIEWER_ITEMS}
        item={viewer.active}
        index={viewer.index}
        position={viewer.position}
        count={viewer.count}
        fallbackAlt="Sinnapi inspiration gallery"
        canStep={viewer.canStep}
        fullViewport
        onClose={viewer.close}
        onNext={viewer.next}
        onPrevious={viewer.previous}
        onSelect={viewer.goTo}
        onKeyDown={viewer.onKeyDown}
      />
    </Container>
  );
}

import NextLink from 'next/link';
import Image from 'next/image';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  SecondaryButton,
  Stack,
  Chip,
  Rating,
} from '@sinnapi/ui';
import { Verified } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { SITE } from '@/lib/config/site';
import { IMAGES } from '@/lib/assets';
import { STATS, TRUST_SIGNALS } from './data/heroContent';

export default function HeroSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        // Deep teal base shows through while the photo decodes / if it ever fails.
        backgroundColor: 'primary.dark',
        pt: { xs: 7, md: 12 },
        pb: { xs: 9, md: 14 },
      }}
    >
      {/*
        Full-bleed Ken Burns background photo. The animated wrapper is the only
        element that moves — `transform` alone is GPU-composited (no layout/paint),
        so the slow drift/zoom adds life cheaply. The image starts above 1× scale
        so panning never exposes the edges. Decorative → empty alt + aria-hidden.
      */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            willChange: 'transform',
            transform: 'scale(1.08)',
            '@keyframes heroKenBurns': {
              '0%': { transform: 'scale(1.08) translate3d(0, 0, 0)' },
              '50%': { transform: 'scale(1.18) translate3d(-1.5%, -1%, 0)' },
              '100%': { transform: 'scale(1.08) translate3d(0, 0, 0)' },
            },
            animation: 'heroKenBurns 28s ease-in-out infinite',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              transform: 'scale(1)',
            },
          }}
        >
          <Image
            src={IMAGES.receptionAutumn.src}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </Box>
      </Box>

      {/* Brand teal overlay — keeps the headline, search & CTAs legible over the
          photo while letting its warm tones glow through toward the bottom-right. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.86)} 45%, ${withAlpha(palette.light.primary.main, 0.6)} 100%)`,
        }}
      />

      {/* Decorative soft glows — purely aesthetic depth, hidden from AT. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: -120, md: -160 },
          right: { xs: -120, md: -80 },
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.secondary.light, 0.35)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -160,
          left: -140,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.primary.light, 0.4)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 6, md: 6 }} alignItems="center">
          {/* Left column — headline, search & CTAs */}
          <Grid item xs={12} md={6}>
            <Chip
              icon={<Verified sx={{ color: 'inherit !important' }} fontSize="small" />}
              label="Uganda's trusted event marketplace"
              size="small"
              sx={{
                mb: 3,
                color: 'common.white',
                bgcolor: withAlpha(common.white, 0.14),
                fontWeight: 600,
                '& .MuiChip-icon': { color: palette.light.secondary.light },
              }}
            />
            <Typography
              variant="h1"
              sx={{
                color: 'common.white',
                fontSize: { xs: '2.4rem', sm: '3rem', md: '3.6rem' },
                lineHeight: 1.05,
              }}
            >
              {SITE.tagline}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mt: 2.5, fontWeight: 400, color: withAlpha(common.white, 0.88), maxWidth: 560 }}
            >
              {SITE.description}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <SecondaryButton component={NextLink} href="/vendors" size="large">
                Browse vendors
              </SecondaryButton>
              <Button
                component={NextLink}
                href="/apply"
                variant="outlined"
                size="large"
                sx={{
                  color: 'common.white',
                  borderColor: withAlpha(common.white, 0.6),
                  '&:hover': {
                    borderColor: 'common.white',
                    bgcolor: withAlpha(common.white, 0.08),
                  },
                }}
              >
                Become a vendor
              </Button>
            </Stack>

            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              spacing={2.5}
              sx={{ mt: 4, color: withAlpha(common.white, 0.85) }}
            >
              {TRUST_SIGNALS.map((t) => (
                <Stack key={t} direction="row" spacing={0.75} alignItems="center">
                  <Verified fontSize="small" sx={{ color: 'secondary.light' }} />
                  <Typography variant="body2">{t}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>

          {/* Right column — editorial photo showcase with a floating proof badge */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                maxWidth: { xs: 420, md: 'none' },
                mx: 'auto',
                pl: { md: 4 },
              }}
            >
              {/* Primary tall image */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 5',
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: `0 30px 60px ${withAlpha(common.black, 0.35)}`,
                  border: `1px solid ${withAlpha(common.white, 0.18)}`,
                  top: { xs: 0, md: 25 },
                }}
              >
                <Image
                  src={IMAGES.ceremonyAisle.src}
                  alt={IMAGES.ceremonyAisle.alt}
                  fill
                  placeholder="blur"
                  sizes="(max-width: 900px) 90vw, 40vw"
                  style={{ objectFit: 'cover' }}
                />
              </Box>

              {/* Offset secondary image — hidden on the smallest screens to avoid clutter */}
              <Box
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  position: 'absolute',
                  bottom: { sm: -58 },
                  left: { sm: -16, md: 8 },
                  width: { sm: 168, md: 196 },
                  aspectRatio: '1 / 1',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: `0 18px 36px ${withAlpha(common.black, 0.4)}`,
                  border: `3px solid ${withAlpha(common.white, 0.9)}`,
                }}
              >
                <Image
                  src={IMAGES.weddingCar.src}
                  alt={IMAGES.weddingCar.alt}
                  fill
                  placeholder="blur"
                  sizes="200px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>

              {/* Floating glass proof badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 12, md: 33 },
                  right: { xs: 12, md: -12 },
                  px: 2,
                  py: 1.25,
                  borderRadius: 3,
                  color: 'common.white',
                  bgcolor: withAlpha(common.black, 0.32),
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${withAlpha(common.white, 0.25)}`,
                  boxShadow: `0 10px 30px ${withAlpha(common.black, 0.3)}`,
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Rating value={5} readOnly size="small" sx={{ color: 'secondary.light' }} />
                  <Typography sx={{ fontWeight: 700 }}>4.9</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: withAlpha(common.white, 0.85) }}>
                  Avg. rating from verified vendors
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Glass stat bar — quantified credibility directly under the hero */}
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 6, md: 8 } }}>
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <Grid item xs={6} md={3} key={s.label}>
                <Box
                  sx={{
                    height: '100%',
                    p: { xs: 2.5, md: 3 },
                    textAlign: 'center',
                    borderRadius: 3,
                    color: 'common.white',
                    bgcolor: withAlpha(common.white, 0.1),
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: `1px solid ${withAlpha(common.white, 0.22)}`,
                    transition: 'transform .2s, background-color .2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      bgcolor: withAlpha(common.white, 0.16),
                    },
                  }}
                >
                  {/* Icon + figure on one row — the icon gives each metric an
                      instant visual anchor; secondary.light keeps it on-brand. */}
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <Icon
                      aria-hidden
                      sx={{
                        color: 'secondary.light',
                        fontSize: { xs: '1.5rem', md: '1.9rem' },
                      }}
                    />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.1,
                        fontSize: { xs: '1.75rem', md: '2.25rem' },
                      }}
                    >
                      {s.value}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.75,
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: withAlpha(common.white, 0.82),
                    }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

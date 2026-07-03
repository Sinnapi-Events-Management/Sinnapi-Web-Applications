import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Grid, Stack, Chip, Typography, Button } from '@sinnapi/ui/atoms';
import { Storefront, ArrowForward, CheckCircle } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import HeroFloatingCard from './HeroFloatingCard';
import { HERO_HIGHLIGHTS, HERO_TRUST } from './data/heroHighlights';

// The primary CTA sends a prospective vendor straight into the in-app
// application form (kept on web-public — no portal redirect until login).
const APPLY_HREF = '/apply/register';

// md+ placements for the glass proof cards floating over the collage.
const FLOAT_POSITIONS = [
  { top: { md: 28 }, left: { md: -24, lg: -40 } },
  { top: { md: '44%' }, right: { md: -20, lg: -44 } },
  { bottom: { md: 28 }, left: { md: 24 } },
] as const;

/**
 * Apply hero — a light, split-asymmetric banner: value proposition and CTAs on
 * the left, a portrait showcase of real vendor craft on the right with frosted
 * proof cards floating over it. Intentionally distinct from the centered,
 * full-bleed dark About hero, while staying on-brand via the teal/gold accents
 * and the same glass-card language used on the impact band.
 */
export default function ApplyHero() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        pt: { xs: 6, md: 10 },
        pb: { xs: 8, md: 12 },
        background: `linear-gradient(180deg, ${withAlpha(palette.light.primary.light, 0.14)} 0%, transparent 55%)`,
      }}
    >
      {/* Decorative depth glows — teal top-left, gold bottom-right. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -160,
          left: -120,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.primary.main, 0.18)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -180,
          right: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(gradientStops.gold, 0.16)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 5, md: 6 }} alignItems="center">
          {/* Copy + CTAs */}
          <Grid item xs={12} md={6}>
            <Chip
              icon={<Storefront sx={{ color: 'inherit !important' }} fontSize="small" />}
              label="Become a Sinnapi vendor"
              size="small"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: 'primary.main',
                bgcolor: withAlpha(palette.light.primary.main, 0.1),
                '& .MuiChip-icon': { color: 'primary.main' },
              }}
            />
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: '2.3rem', sm: '2.9rem', md: '3.4rem' }, lineHeight: 1.08 }}
            >
              Grow your event business with Sinnapi
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mt: 2.5,
                fontWeight: 400,
                color: 'text.secondary',
                maxWidth: 520,
              }}
            >
              Join a trusted marketplace of verified vendors. Reach ready-to-book clients, manage
              every enquiry in one place, and get paid securely through escrow.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                component={NextLink}
                href={APPLY_HREF}
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
              >
                Start your application
              </Button>
              <Button component={NextLink} href="/pricing" variant="outlined" size="large">
                View pricing
              </Button>
            </Stack>

            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              spacing={{ xs: 1.5, sm: 2.5 }}
              sx={{ mt: 3.5 }}
            >
              {HERO_TRUST.map((item) => (
                <Stack key={item} direction="row" spacing={0.75} alignItems="center">
                  <CheckCircle sx={{ color: 'primary.main' }} fontSize="small" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>

          {/* Showcase collage with floating proof cards (md+) */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', mx: { xs: 'auto', md: 0 }, maxWidth: 460 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: { xs: '4 / 3', md: '4 / 5' },
                  borderRadius: 5,
                  overflow: 'hidden',
                  boxShadow: `0 30px 60px ${withAlpha(common.black, 0.22)}`,
                }}
              >
                <Image
                  src={IMAGES.cakeLeopard.src}
                  alt={IMAGES.cakeLeopard.alt}
                  fill
                  priority
                  placeholder="blur"
                  sizes="(max-width: 900px) 90vw, 45vw"
                  style={{ objectFit: 'cover' }}
                />
              </Box>

              {HERO_HIGHLIGHTS.map((h, i) => (
                <HeroFloatingCard
                  key={h.label}
                  Icon={h.Icon}
                  value={h.value}
                  label={h.label}
                  sx={{
                    position: 'absolute',
                    display: { xs: 'none', md: 'flex' },
                    ...FLOAT_POSITIONS[i],
                  }}
                />
              ))}
            </Box>

            {/* Mobile fallback: proof cards flow below the image instead of floating. */}
            <Stack
              spacing={1.5}
              sx={{ display: { xs: 'flex', md: 'none' }, mt: 3, maxWidth: 460, mx: 'auto' }}
            >
              {HERO_HIGHLIGHTS.map((h) => (
                <HeroFloatingCard key={h.label} Icon={h.Icon} value={h.value} label={h.label} />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

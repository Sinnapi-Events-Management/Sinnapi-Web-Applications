import NextLink from 'next/link';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  PrimaryButton,
  SecondaryButton,
  Stack,
  Paper,
  Chip,
  TextField,
} from '@sinnapi/ui';
import { Search, Verified } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { SITE } from '@/lib/config/site';
import { HERO_IMAGE, STATS, TRUST_SIGNALS } from './data/heroContent';

export default function HeroSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        py: { xs: 9, md: 14 },
      }}
    >
      {/*
        Ken Burns image layer — kept on its own element so only `transform`
        animates (GPU-composited, no layout/paint), leaving the gradient and
        content untouched. The image stays a CSS background to match the rest
        of the home page; the slow drift/zoom adds life without extra JS.
        Starts above 1× scale so panning never exposes the edges.
      */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
      />
      {/* Brand gradient overlay — keeps headline/CTAs legible over any photo. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.94)} 0%, ${withAlpha(palette.light.primary.main, 0.86)} 55%, ${withAlpha(palette.light.primary.light, 0.7)} 100%)`,
        }}
      />

      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 6, md: 5 }} alignItems="center">
          {/* Left column — headline, search & CTAs */}
          <Grid item xs={12} md={7}>
            <Chip
              label="Uganda's trusted event marketplace"
              size="small"
              sx={{
                mb: 3,
                color: 'common.white',
                bgcolor: withAlpha(common.white, 0.14),
                fontWeight: 600,
              }}
            />
            <Typography
              variant="h1"
              sx={{ color: 'common.white', fontSize: { xs: '2.25rem', md: '3.4rem' } }}
            >
              {SITE.tagline}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mt: 2.5, fontWeight: 400, color: withAlpha(common.white, 0.88), maxWidth: 680 }}
            >
              {SITE.description}
            </Typography>

            {/* Discovery search — plain GET form so it works without client JS. */}
            <Paper
              component="form"
              action="/vendors"
              method="GET"
              elevation={6}
              sx={{
                mt: 4,
                p: 1,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                borderRadius: 2,
                maxWidth: 620,
              }}
            >
              <TextField
                name="q"
                placeholder="Search photographers, caterers, venues…"
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: <Search sx={{ color: 'text.disabled', mr: 1 }} />,
                }}
                sx={{ flex: 1, px: 1.5 }}
              />
              <PrimaryButton type="submit" size="large" sx={{ px: 4 }}>
                Search
              </PrimaryButton>
            </Paper>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <SecondaryButton component={NextLink} href="/vendors" size="large">
                Browse vendors
              </SecondaryButton>
              <Button
                component={NextLink}
                href="/apply"
                variant="outlined"
                size="large"
                sx={{ color: 'common.white', borderColor: withAlpha(common.white, 0.6) }}
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

          {/* Right column — glassmorphism stat tiles, centered (2 cols × 2 rows) */}
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ maxWidth: 460 }}>
                {STATS.map((s) => (
                  <Grid item xs={6} key={s.label}>
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
                        boxShadow: `0 8px 32px ${withAlpha(common.black, 0.18)}`,
                        transition: 'transform .2s, background-color .2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          bgcolor: withAlpha(common.white, 0.16),
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.1,
                          fontSize: { xs: '1.75rem', md: '2.25rem' },
                        }}
                      >
                        {s.value}
                      </Typography>
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
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

import { Box, Stack, Typography, alpha } from '@sinnapi/ui';
import { APP } from '@/lib/config';
import authBackground from '@/assets/images/image-2.webp';
import logo from '@/assets/logo-light.png';
import { AUTH_ROTATE_MS, AUTH_SLIDES } from './authContent';
import { useAuthCarousel } from './hooks/useAuthCarousel';

// Left brand panel: full-bleed photo, layered legibility gradient, and a
// frosted-glass card whose headline/body cross-slide through AUTH_SLIDES.
export default function AuthShowcase() {
  const { index, goTo } = useAuthCarousel();

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { md: 5, lg: 7 },
      }}
    >
      {/* Legibility wash — brand teal diagonal grounding the frosted card. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: (t) =>
            `linear-gradient(160deg, ${alpha(t.palette.primary.dark, 0.58)} 0%, ${alpha(
              t.palette.primary.dark,
              0.18,
            )} 45%, ${alpha('#000000', 0.38)} 100%)`,
        }}
      />
      {/* Soft bottom vignette for depth so the card reads as lifted off the photo. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 12%, transparent 40%, ${alpha(
            '#000000',
            0.28,
          )} 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Frosted-glass showcase card */}
      <Stack
        spacing={4}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          p: { md: 4, lg: 5 },
          borderRadius: 4,
          color: 'common.white',
          bgcolor: (t) => alpha(t.palette.common.white, 0.08),
          // Dimensional glass: a faint diagonal sheen across the surface rather
          // than a flat translucent fill.
          backgroundImage: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.common.white, 0.16)} 0%, ${alpha(
              t.palette.common.white,
              0.04,
            )} 58%)`,
          border: (t) => `1px solid ${alpha(t.palette.common.white, 0.22)}`,
          backdropFilter: 'blur(18px) saturate(135%)',
          WebkitBackdropFilter: 'blur(18px) saturate(135%)',
          // Lift shadow + a hairline top sheen (inset) for a real glass edge.
          boxShadow: (t) =>
            `0 28px 70px ${alpha(t.palette.primary.dark, 0.42)}, inset 0 1px 0 ${alpha(
              t.palette.common.white,
              0.35,
            )}`,
        }}
      >
        <Stack direction="row" spacing={1.75} alignItems="center">
          <Box
            component="img"
            src={logo}
            alt={`${APP.name} logo`}
            sx={{ height: 44, width: 'auto', display: 'block' }}
          />
          <Box
            sx={{
              width: '1px',
              height: 30,
              bgcolor: (t) => alpha(t.palette.common.white, 0.28),
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              fontFamily: '"Fraunces", Georgia, serif',
            }}
          >
            <Box component="span" sx={{ fontWeight: 600, fontSize: 26, letterSpacing: '0.3px' }}>
              {APP.name}
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: '"Inter", Helvetica, Arial, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                px: 1,
                py: 0.5,
                borderRadius: 999,
                color: 'primary.dark',
                bgcolor: 'secondary.light',
                boxShadow: (t) => `0 2px 8px ${alpha(t.palette.secondary.dark, 0.4)}`,
              }}
            >
              {APP.tagline}
            </Box>
          </Box>
        </Stack>

        {/* Sliding text — slides stacked; only the active one is visible/interactive. */}
        <Box sx={{ position: 'relative', minHeight: 168 }}>
          {AUTH_SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <Box
                key={slide.title}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(14px)',
                  filter: active ? 'blur(0)' : 'blur(4px)',
                  transition:
                    'opacity .6s cubic-bezier(.22,.61,.36,1), transform .6s cubic-bezier(.22,.61,.36,1), filter .6s ease',
                  pointerEvents: active ? 'auto' : 'none',
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'opacity .2s ease',
                    transform: 'none',
                    filter: 'none',
                  },
                }}
              >
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { md: '2.1rem', lg: '2.5rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-0.5px',
                    mb: 1.5,
                  }}
                >
                  {slide.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    letterSpacing: '0.1px',
                    opacity: 0.88,
                    maxWidth: 380,
                  }}
                >
                  {slide.body}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Slide indicators — the active one fills as a progress bar over the rotation. */}
        <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mt: 1 }}>
          {AUTH_SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <Box
                key={slide.title}
                component="button"
                type="button"
                tabIndex={-1}
                aria-label={`Show slide ${i + 1}`}
                onClick={() => goTo(i)}
                sx={{
                  p: 0,
                  border: 0,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  height: 6,
                  width: active ? 30 : 6,
                  borderRadius: 999,
                  bgcolor: (t) => alpha(t.palette.common.white, active ? 0.25 : 0.4),
                  transition: 'width .35s cubic-bezier(.22,.61,.36,1), background-color .35s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.common.white, active ? 0.25 : 0.6),
                  },
                }}
              >
                {active && (
                  <Box
                    // Re-keyed on index so the fill restarts each slide, staying in
                    // step with the carousel's auto-advance (and manual selection).
                    key={index}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      transformOrigin: 'left',
                      borderRadius: 'inherit',
                      bgcolor: (t) => t.palette.secondary.main,
                      animation: `authProgress ${AUTH_ROTATE_MS}ms linear forwards`,
                      '@keyframes authProgress': {
                        from: { transform: 'scaleX(0)' },
                        to: { transform: 'scaleX(1)' },
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        animation: 'none',
                        transform: 'scaleX(1)',
                      },
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

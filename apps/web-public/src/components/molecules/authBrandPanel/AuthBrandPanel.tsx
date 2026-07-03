import type { ElementType } from 'react';
import Image from 'next/image';
import { Box, Stack, Typography, Rating } from '@sinnapi/ui/atoms';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import type { LocalImage } from '@/lib/assets';

export type AuthHighlight = { Icon: ElementType; text: string };

export type AuthBrandPanelProps = {
  /** Small uppercase kicker above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Full-bleed background photo (blurred-up via next/image). */
  image: LocalImage;
  /** Icon + copy value bullets — the panel's signature element. */
  highlights: AuthHighlight[];
  /** Social-proof strip pinned to the foot of the panel. */
  trust: { rating: number; caption: string };
};

/**
 * The branded left half of the split auth screen.
 *
 * Shares the home/about hero's teal-over-photo language for brand continuity,
 * but is intentionally its own creature: left-aligned editorial copy, a vertical
 * icon *highlights list*, and a foot *trust strip* — none of which the centered
 * AboutHero has. Static image (no Ken Burns) keeps it light; the lone entrance
 * fade is CSS-only and disabled under `prefers-reduced-motion`. Server component.
 */
export default function AuthBrandPanel({
  eyebrow,
  title,
  subtitle,
  image,
  highlights,
  trust,
}: AuthBrandPanelProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        minHeight: { md: 560 },
        color: 'common.white',
        backgroundColor: 'primary.dark',
        borderRadius: { xs: 4, md: 5 },
      }}
    >
      {/* Decorative full-bleed photo → empty alt + aria-hidden. */}
      <Image
        src={image.src}
        alt=""
        aria-hidden
        fill
        priority
        placeholder="blur"
        sizes="(max-width: 900px) 100vw, 50vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Teal brand wash — angled the opposite way to the hero so the two pages
          read as siblings, not copies. Keeps copy legible over any photo. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(215deg, ${withAlpha(gradientStops.tealDeep, 0.92)} 0%, ${withAlpha(palette.light.primary.dark, 0.9)} 55%, ${withAlpha(palette.light.primary.main, 0.7)} 100%)`,
        }}
      />

      {/* Soft corner glow for depth. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -140,
          left: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.secondary.light, 0.3)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <Stack
        sx={{
          position: 'relative',
          height: '100%',
          justifyContent: 'space-between',
          p: { xs: 4, md: 6 },
          animation: 'authPanelIn .6s ease both',
          '@keyframes authPanelIn': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'none' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Box>
          <Typography
            component="p"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              mb: 2.5,
              fontSize: '.75rem',
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: palette.light.secondary.light,
              '&::before': {
                content: '""',
                width: 28,
                height: 2,
                borderRadius: 1,
                bgcolor: palette.light.secondary.light,
              },
            }}
          >
            {eyebrow}
          </Typography>

          <Typography
            variant="h2"
            sx={{
              color: 'common.white',
              fontSize: { xs: '2rem', md: '2.6rem' },
              lineHeight: 1.12,
              maxWidth: 460,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="body1"
            sx={{ mt: 2, color: withAlpha(common.white, 0.88), maxWidth: 420 }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Stack spacing={1.75} sx={{ my: 4 }}>
          {highlights.map(({ Icon, text }) => (
            <Stack key={text} direction="row" alignItems="center" spacing={1.5}>
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'common.white',
                  bgcolor: withAlpha(common.white, 0.14),
                }}
              >
                <Icon fontSize="small" sx={{ color: palette.light.secondary.light }} />
              </Box>
              <Typography variant="body2" sx={{ color: withAlpha(common.white, 0.94) }}>
                {text}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Box
          sx={{
            pt: 3,
            borderTop: `1px solid ${withAlpha(common.white, 0.18)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Rating value={trust.rating} precision={0.5} readOnly size="small" />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'common.white' }}>
              {trust.rating.toFixed(1)}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: withAlpha(common.white, 0.82) }}>
            {trust.caption}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

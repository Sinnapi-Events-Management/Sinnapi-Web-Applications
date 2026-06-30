import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack } from '@sinnapi/ui';
import { Verified } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { VendorsSearchParams } from '../../utils/filterVendors';
import HeroSearchForm from './molecules/HeroSearchForm';
import HeroStats from './molecules/HeroStats';
import { QUICK_FILTERS } from './data/quickFilters';

/**
 * Vendors hero — keeps the brand teal-over-photo treatment for continuity with
 * the About/Events heroes, but is its own thing: a discovery-first banner whose
 * focal point is the search pill, lit by a single soft spotlight that slowly
 * breathes (GPU-only transform, paused under `prefers-reduced-motion`) rather
 * than the Events hero's drifting orbs. A trust strip of marketplace figures
 * sits below to build confidence. Fully server-rendered with a `priority` image
 * so the LCP isn't gated behind client JS.
 */
export default function VendorsHero({ defaults }: { defaults: VendorsSearchParams }) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 8, md: 12 },
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* Full-bleed background photo. Decorative → empty alt + aria-hidden. */}
      <Image
        src={IMAGES.ceremonyAisle.src}
        alt=""
        aria-hidden
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Brand teal overlay keeps the copy legible while the photo glows through. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(160deg, ${withAlpha(gradientStops.tealDeep, 0.96)} 0%, ${withAlpha(palette.light.primary.dark, 0.9)} 52%, ${withAlpha(palette.light.primary.main, 0.7)} 100%)`,
        }}
      />

      {/* Single soft spotlight centred on the search pill; slowly breathes for depth. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          width: { xs: 520, md: 760 },
          height: { xs: 520, md: 760 },
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.secondary.light, 0.28)} 0%, transparent 68%)`,
          pointerEvents: 'none',
          animation: 'vendorsHeroGlow 12s ease-in-out infinite',
          '@keyframes vendorsHeroGlow': {
            '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.85 },
            '50%': { transform: 'translate(-50%, -50%) scale(1.12)', opacity: 1 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />

      <Container
        sx={{ position: 'relative', maxWidth: 'md', textAlign: { xs: 'left', md: 'center' } }}
      >
        <Chip
          icon={<Verified sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Verified marketplace"
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
            lineHeight: 1.08,
          }}
        >
          Book the right vendor, every time.
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mt: 2.5,
            mb: 4,
            fontWeight: 400,
            color: withAlpha(common.white, 0.9),
            maxWidth: 620,
            mx: { md: 'auto' },
          }}
        >
          Discover vetted, verified providers across Uganda and beyond. Search by service, town or
          budget — then sign in to chat, request quotes, and book.
        </Typography>

        <HeroSearchForm defaults={defaults} />

        {/* Fast paths into the same server-side filtering the form drives. */}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 3, justifyContent: { md: 'center' } }}
        >
          <Typography
            variant="body2"
            sx={{ color: withAlpha(common.white, 0.7), mr: 0.5, py: 0.5 }}
          >
            Popular:
          </Typography>
          {QUICK_FILTERS.map((quick) => (
            <Chip
              key={quick.category}
              component={NextLink}
              href={`/vendors?category=${quick.category}`}
              label={quick.label}
              clickable
              size="small"
              sx={{
                color: 'common.white',
                bgcolor: withAlpha(common.white, 0.12),
                border: '1px solid',
                borderColor: withAlpha(common.white, 0.28),
                fontWeight: 600,
                transition: 'background-color .2s ease',
                '&:hover': { bgcolor: withAlpha(common.white, 0.22) },
              }}
            />
          ))}
        </Stack>

        <HeroStats />
      </Container>
    </Box>
  );
}

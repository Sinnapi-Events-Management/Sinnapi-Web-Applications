import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack } from '@sinnapi/ui';
import { CalendarMonth } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { EventsSearchParams } from '../../data/filterEvents';
import HeroSearchForm from './molecules/HeroSearchForm';
import { QUICK_FILTERS } from './data/quickFilters';

/**
 * Events hero — keeps the brand teal-over-photo treatment for continuity with
 * the About/How-it-works heroes, but is intentionally its own thing: a
 * search-led, engagement-first banner. The search pill is the focal point and
 * two slow drifting orbs add depth without touching the main thread (GPU-only
 * transforms, paused under `prefers-reduced-motion`). Fully server-rendered with
 * a `priority` image so the LCP isn't gated behind client JS.
 */
export default function EventsHero({ defaults }: { defaults: EventsSearchParams }) {
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
        src={IMAGES.receptionAutumn.src}
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
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.9)} 48%, ${withAlpha(palette.light.primary.main, 0.66)} 100%)`,
        }}
      />

      {/* Two slow-drifting glows for depth. Decorative; motion paused for reduced-motion users. */}
      {[
        { top: '-12%', left: '-6%', size: 420, color: palette.light.secondary.light, dur: '11s' },
        { bottom: '-18%', right: '-4%', size: 380, color: palette.light.primary.light, dur: '14s' },
      ].map((orb, i) => (
        <Box
          key={i}
          aria-hidden
          sx={{
            position: 'absolute',
            top: orb.top,
            bottom: orb.bottom,
            left: orb.left,
            right: orb.right,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(orb.color, 0.3)} 0%, transparent 70%)`,
            pointerEvents: 'none',
            animation: `eventsHeroFloat ${orb.dur} ease-in-out infinite`,
            animationDelay: i === 0 ? '0s' : '-4s',
            '@keyframes eventsHeroFloat': {
              '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
              '50%': { transform: 'translate3d(0, 26px, 0)' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
      ))}

      <Container
        sx={{ position: 'relative', maxWidth: 'md', textAlign: { xs: 'left', md: 'center' } }}
      >
        <Chip
          icon={<CalendarMonth sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Discover events"
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
          Find the event. Bring it to life.
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
          Browse curated inspiration and open events looking for vendors. Search by occasion, town,
          or budget — then sign in to express interest.
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
              key={quick.type}
              component={NextLink}
              href={`/events?type=${quick.type}`}
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
      </Container>
    </Box>
  );
}

import NextLink from 'next/link';
import { Box, Container, Typography, Chip, Stack, Link } from '@sinnapi/ui/atoms';
import {
  Event as EventIcon,
  Place as PlaceIcon,
  ArrowBack,
  NavigateNext,
} from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import ShareButton from '@/components/atoms/shareButton';
import { titleize } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';

/**
 * Cover hero for a single event — a full-bleed photo under a brand teal scrim
 * with the title, occasion/source chips and quick date/location meta laid over
 * it. Carries the breadcrumb, a back link and the share control so the page
 * frame reads as one editorial banner. The cover uses a plain <img> (via Box)
 * so any cover URL works without remote-image config; the scrim guarantees the
 * white overlay copy stays legible over bright photos.
 */
export default function EventDetailHero({ event }: { event: EventCardModel }) {
  const isInspiration = event.source === 'admin';
  const overlayLink = { color: withAlpha(common.white, 0.85), '&:hover': { color: common.white } };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        minHeight: { xs: 380, md: 480 },
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <Box
        component="img"
        src={event.cover_image_url ?? '/placeholder-event.svg'}
        alt={event.title}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Brand teal scrim — darkest at the bottom where the copy sits. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${withAlpha(gradientStops.tealDeep, 0.45)} 0%, ${withAlpha(gradientStops.tealDeep, 0.2)} 32%, ${withAlpha(palette.light.primary.dark, 0.92)} 100%)`,
        }}
      />

      {/* Top bar: breadcrumb (left) + share (right), pinned over the photo. */}
      <Container sx={{ position: 'absolute', top: 0, left: 0, right: 0, pt: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ minWidth: 0, color: withAlpha(common.white, 0.85) }}
          >
            <Link component={NextLink} href="/" underline="hover" sx={overlayLink}>
              Home
            </Link>
            <NavigateNext sx={{ fontSize: 16, opacity: 0.7 }} />
            <Link component={NextLink} href="/events" underline="hover" sx={overlayLink}>
              Events
            </Link>
            <NavigateNext sx={{ fontSize: 16, opacity: 0.7 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'common.white',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: 140, sm: 320 },
              }}
            >
              {event.title}
            </Typography>
          </Stack>

          <ShareButton
            title={event.title}
            sx={{
              flexShrink: 0,
              color: 'common.white',
              borderColor: withAlpha(common.white, 0.5),
              '&:hover': { borderColor: 'common.white', bgcolor: withAlpha(common.white, 0.08) },
            }}
          />
        </Stack>
      </Container>

      {/* Bottom: back link, chips, title, quick meta. */}
      <Container sx={{ position: 'relative', pb: { xs: 4, md: 6 }, pt: { xs: 10, md: 12 } }}>
        <Link
          component={NextLink}
          href="/events"
          underline="none"
          sx={{
            mb: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2.25,
            py: 1,
            fontWeight: 600,
            color: 'common.white',
            borderRadius: 999,
            // Glassmorphism: translucent fill + blur of the photo behind it,
            // a hairline highlight border, and a soft drop shadow for lift.
            bgcolor: withAlpha(common.white, 0.12),
            border: '1px solid',
            borderColor: withAlpha(common.white, 0.3),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: `0 8px 24px -12px ${withAlpha(common.black, 0.6)}`,
            transition: 'background-color .25s ease, border-color .25s ease, transform .25s ease',
            '&:hover': {
              bgcolor: withAlpha(common.white, 0.22),
              borderColor: withAlpha(common.white, 0.55),
              transform: 'translateX(-3px)',
            },
            // Slide the arrow back a touch on hover for a subtle directional cue.
            '&:hover .back-arrow': { transform: 'translateX(-2px)' },
          }}
        >
          <ArrowBack
            className="back-arrow"
            sx={{ fontSize: 18, transition: 'transform .25s ease' }}
          />
          Back to events
        </Link>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {event.event_type && (
            <Chip
              label={titleize(event.event_type)}
              size="small"
              sx={{
                color: 'common.white',
                bgcolor: withAlpha(common.white, 0.18),
                fontWeight: 600,
              }}
            />
          )}
          <Chip
            label={isInspiration ? 'Inspiration' : 'Open event'}
            size="small"
            sx={{
              color: 'common.white',
              fontWeight: 600,
              bgcolor: isInspiration ? withAlpha(common.black, 0.4) : 'primary.main',
            }}
          />
        </Stack>

        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2.1rem', sm: '2.8rem', md: '3.4rem' },
            lineHeight: 1.1,
            maxWidth: 860,
          }}
        >
          {event.title}
        </Typography>

        <Stack
          direction="row"
          spacing={3}
          sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.5, color: withAlpha(common.white, 0.9) }}
        >
          {event.event_date && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <EventIcon fontSize="small" />
              <Typography>
                {new Date(event.event_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
            </Stack>
          )}
          {event.location && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PlaceIcon fontSize="small" />
              <Typography>{titleize(event.location)}</Typography>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

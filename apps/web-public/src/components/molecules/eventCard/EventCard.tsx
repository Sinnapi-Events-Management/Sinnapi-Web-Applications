import NextLink from 'next/link';
import { Box, Typography, Chip, Stack } from '@sinnapi/ui/atoms';
import { Card, CardActionArea, CardContent, CardMedia } from '@sinnapi/ui/molecules';
import { Event as EventIcon, Place as PlaceIcon, Payments } from '@mui/icons-material';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { titleize, formatMoney } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';

/** Compact budget label from the event's [min, max] range; null when unpriced. */
function budgetLabel(event: EventCardModel): string | null {
  const { currency } = event;
  const min = event.budget_min;
  const max = event.budget_max;
  if (min != null && max != null) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (min != null) return `From ${formatMoney(min, currency)}`;
  if (max != null) return `Up to ${formatMoney(max, currency)}`;
  return null;
}

/** Clamp a Typography block to `lines` rows with an ellipsis. */
const clampLines = (lines: number) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
});

/**
 * Event card — a scannable, fixed-rhythm tile: cover with a source badge, an
 * occasion chip, a two-line title + teaser, then date / location / budget meta.
 * The whole card is one link; on hover it lifts and the cover gently zooms.
 * Budget and location render only when present, so it stays correct for the
 * lighter home-page inspiration feed too.
 */
export default function EventCard({ event }: { event: EventCardModel }) {
  const budget = budgetLabel(event);
  const isInspiration = event.source === 'admin';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        overflow: 'hidden',
        transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          borderColor: 'primary.main',
        },
        '&:hover .event-card-media': { transform: 'scale(1.06)' },
      }}
    >
      <CardActionArea
        component={NextLink}
        href={`/events/${event.id}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardMedia
            component="img"
            height="190"
            image={event.cover_image_url ?? '/placeholder-event.svg'}
            alt={event.title}
            className="event-card-media"
            sx={{ bgcolor: 'grey.100', transition: 'transform .4s ease' }}
          />
          {/* Bottom scrim so the badge stays legible over bright photos. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${withAlpha(common.black, 0.28)} 0%, transparent 42%)`,
            }}
          />
          <Chip
            size="small"
            label={isInspiration ? 'Inspiration' : 'Open event'}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              fontWeight: 600,
              color: 'common.white',
              bgcolor: isInspiration ? withAlpha(common.black, 0.55) : 'primary.main',
              backdropFilter: 'blur(4px)',
            }}
          />
        </Box>

        <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {event.event_type && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={titleize(event.event_type)}
              sx={{ alignSelf: 'flex-start', mb: 1, fontWeight: 600 }}
            />
          )}

          <Typography variant="h6" sx={{ lineHeight: 1.25, ...clampLines(2) }}>
            {event.title}
          </Typography>

          {event.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ...clampLines(2) }}>
              {event.description}
            </Typography>
          )}

          {/* Meta pinned to the bottom so cards of varied copy keep a shared baseline. */}
          <Stack spacing={0.75} sx={{ mt: 'auto', pt: 2, color: 'text.secondary' }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {event.event_date && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <EventIcon fontSize="inherit" />
                  <Typography variant="body2">
                    {new Date(event.event_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Typography>
                </Stack>
              )}
              {event.location && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PlaceIcon fontSize="inherit" />
                  <Typography variant="body2">{titleize(event.location)}</Typography>
                </Stack>
              )}
            </Stack>
            {budget && (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ color: 'text.primary' }}
              >
                <Payments fontSize="inherit" color="primary" />
                <Typography variant="body2" fontWeight={600}>
                  {budget}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

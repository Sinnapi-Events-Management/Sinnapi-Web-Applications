import { Box, Chip, HeroSurface, IconBadge, Stack, Typography } from '@sinnapi/ui';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { eventUrgency } from '@/lib/events';
import type { EventTypeRef, PublicEventDetailModel } from '@/lib/types';
import EventUrgencyPill from '@/pages/publicEvents/components/atoms/EventUrgencyPill';
import EventHeroMeta from '../molecules/EventHeroMeta';

type Props = {
  event: PublicEventDetailModel;
  eventType: EventTypeRef | null;
  /** Client-posted events accept an expression of interest; admin ones don't. */
  actionable: boolean;
};

/**
 * Banner header: what the job is, what kind of occasion it is, how soon it is,
 * and the handful of facts worth reading before opening a section.
 *
 * There is no client name and no avatar, unlike every other detail hero in this
 * portal. That is the feed's promise kept: `search_events_public` withholds the
 * poster's identity on purpose, so a vendor browsing open work sees the brief
 * and not the client behind it. They meet through the quotation, once there is
 * one. The occasion's glyph stands in for the avatar so the banner keeps the
 * shape a vendor knows from the quotation and booking pages.
 *
 * The urgency pill is the same component the feed's cards use, which is the
 * reason it was moved off the cover scrim and onto theme colours — it has to
 * work on this tinted banner and on a plain card, in both colour schemes.
 *
 * Sized down on a phone: the title runs to a sentence on a real brief
 * ("Garden wedding for 200 guests in Munyonyo"), and at `h4` on a 360px screen
 * it took four lines before the chips had anywhere to sit.
 */
export default function EventHero({ event, eventType, actionable }: Props) {
  const urgency = eventUrgency(event.event_date);

  return (
    <HeroSurface>
      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <IconBadge size={56} circular sx={{ flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}>
          <CelebrationIcon />
        </IconBadge>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ lineHeight: 1.15, fontSize: { xs: '1.375rem', sm: '2.125rem' } }}
          >
            {event.title}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            sx={{ mt: 1 }}
          >
            {eventType && <Chip size="small" variant="outlined" label={eventType.name} />}
            {/* Says the same thing the withheld action does, in words. A vendor
                who cannot find the button needs to know there isn't one. */}
            {!actionable && <Chip size="small" variant="outlined" label="Inspiration only" />}
            {urgency && <EventUrgencyPill urgency={urgency} />}
          </Stack>
        </Box>
      </Stack>

      <EventHeroMeta event={event} />
    </HeroSurface>
  );
}

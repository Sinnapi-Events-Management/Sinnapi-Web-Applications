import { Card, CardContent, Chip, Stack, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { PublicEventModel } from '@/lib/types';
import EventCoverMedia, { COVER_ACCENT_COUNT } from '../atoms/EventCoverMedia';
import EventUrgencyPill from '../atoms/EventUrgencyPill';
import EventCardMeta from './EventCardMeta';
import EventCardFooter from './EventCardFooter';
import { budgetLabel, coverAccentIndex, eventUrgency, isActionable } from '../../schema/presenter';

type PublicEventCardProps = {
  event: PublicEventModel;
  vendorId: string;
  /** Whether this vendor has already expressed interest. */
  interested: boolean;
};

/**
 * One public event, as a vendor sees it.
 *
 * Structural only — every derivation it renders (the budget string, how soon
 * the date is, which fallback wash the cover gets, whether the event can be
 * acted on) comes from `schema/presenter`, and each band of the card is its own
 * piece. What is left here is the order those bands sit in, which is the actual
 * design decision:
 *
 *   cover + urgency → what and how soon
 *   chips + title   → what kind of job this is
 *   meta            → when and where
 *   description     → the poster's own words, clamped
 *   footer          → what it's worth, and the one action
 *
 * The card is a flex column with the content flexing, so the footer pins to the
 * bottom regardless of how much the middle carries. Combined with the clamped
 * description that gives every card in a row the same baseline — the thing that
 * makes a grid scannable rather than merely tidy.
 */
export default function PublicEventCard({ event, vendorId, interested }: PublicEventCardProps) {
  const urgency = eventUrgency(event.event_date);
  const actionable = isActionable(event);

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color .2s ease, box-shadow .2s ease, transform .2s ease',
        // Lifts on hover, and only on devices that actually hover — a touch
        // device holds :hover after a tap, leaving one card stuck raised.
        '@media (hover: hover)': {
          '&:hover': {
            borderColor: 'secondary.main',
            boxShadow: 6,
            transform: 'translateY(-2px)',
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <EventCoverMedia
        src={event.cover_image_url}
        alt={event.title}
        accent={coverAccentIndex(event, COVER_ACCENT_COUNT)}
        overlay={urgency ? <EventUrgencyPill urgency={urgency} /> : null}
      />

      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          {/* The RPC returns the occasion's own display name, so there is no
              token left to titleize — the chip reads what the admin named it. */}
          {event.event_type_name && (
            <Chip size="small" color="secondary" variant="outlined" label={event.event_type_name} />
          )}
          {/* The source chip only speaks up for inspiration. On the open events
              the tab bar and the footer's button already say what this is, and
              a chip repeating it is the kind of redundancy that makes a card
              feel busy without telling anyone anything. */}
          {!actionable && <Chip size="small" variant="outlined" label="Inspiration" />}
        </Stack>

        <Typography
          variant="h6"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </Typography>

        <EventCardMeta
          date={event.event_date ? formatDate(event.event_date) : null}
          location={event.location}
        />

        {event.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              // Two lines, hard. A brief can run to several paragraphs, and one
              // long one used to stretch its whole grid row — the card is a
              // decision surface, not the place to read the spec.
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </Typography>
        )}
      </CardContent>

      <EventCardFooter
        eventId={event.id}
        vendorId={vendorId}
        budget={budgetLabel(event)}
        actionable={actionable}
        interested={interested}
      />
    </Card>
  );
}

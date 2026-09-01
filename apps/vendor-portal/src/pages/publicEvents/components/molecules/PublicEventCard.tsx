import { Card, CardContent, Chip, Divider, Stack, Typography } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { formatDate } from '@/lib/config';
import { budgetLabel, eventUrgency, isActionable } from '@/lib/events';
import type { PublicEventModel } from '@/lib/types';
import EventUrgencyPill from '../atoms/EventUrgencyPill';
import EventCardMeta from './EventCardMeta';
import EventCardBudget from './EventCardBudget';
import EventCardActions from './EventCardActions';

type PublicEventCardProps = {
  event: PublicEventModel;
  /** Whether this vendor has already expressed interest. */
  interested: boolean;
};

/**
 * One public event, as a vendor sees it.
 *
 * Structurally the client portal's `MyEventCard`, deliberately: it is the same
 * object seen from the other side of the deal, and the two portals showing it
 * in two shapes made a vendor re-learn a card they already knew. That is also
 * why the cover image is gone — it was 156px of gradient placeholder on almost
 * every card (`cover_image_url` is optional and rarely filled), pushing the two
 * facts a vendor actually scans for, the date and the budget, below the fold of
 * a phone-sized card.
 *
 * The bands, in order:
 *
 *   chips     → what kind of job this is, and how soon
 *   title     → the brief, and the link to its page
 *   meta      → when and where
 *   summary   → the poster's own words, clamped to two lines
 *   budget    → what it's worth
 *   actions   → the one thing a vendor can do about it
 *
 * Everything it renders is derived in `@/lib/events`, so this file is layout
 * only. The card is a flex column and the budget/action block carries
 * `mt: auto`, so those two bands pin to the bottom regardless of how much the
 * middle holds — combined with the clamped description that gives every card in
 * a row the same baseline, which is what makes a grid scannable rather than
 * merely tidy.
 */
export default function PublicEventCard({ event, interested }: PublicEventCardProps) {
  const urgency = eventUrgency(event.event_date);
  const actionable = isActionable(event);

  return (
    <Card
      variant="outlined"
      // `position: relative` is what the stretched title link below anchors to.
      sx={{
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: (t) => t.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { borderColor: 'secondary.main', boxShadow: 2 },
        // The card is a link target, so it has to show focus. The ring is drawn
        // on the card rather than the anchor because the anchor is only the
        // title text — focusing it should light up the thing that will open.
        '&:focus-within': {
          borderColor: 'secondary.main',
          outline: '2px solid',
          outlineColor: 'secondary.main',
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ minWidth: 0 }}>
            {/* The RPC returns the occasion's own display name, so there is no
                token left to titleize — the chip reads what the admin named it. */}
            {event.event_type_name && (
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={event.event_type_name}
              />
            )}
            {/* The source chip only speaks up for inspiration. On the open
                events the tab bar and the action row already say what this is,
                and a chip repeating it is the kind of redundancy that makes a
                card feel busy without telling anyone anything. */}
            {!actionable && <Chip size="small" variant="outlined" label="Inspiration" />}
          </Stack>

          {/* Right-hand slot, where the client portal's card carries its status
              chip. A vendor has no status to read on someone else's event; how
              soon it is, is the equivalent fact. */}
          {urgency && <EventUrgencyPill urgency={urgency} />}
        </Stack>

        {/*
          A "stretched link": the anchor is the title, and its ::after covers the
          whole card so the entire surface opens the event.

          The alternative — wrapping the card in `CardActionArea` — cannot be
          used here, because the action row below contains a button, and a button
          inside a link is invalid HTML that assistive technology reports
          inconsistently and that swallows the inner control's activation. This
          way there is exactly ONE link in the accessibility tree, it is named by
          the event's own title rather than by the whole card's text, and the
          controls that must stay independently clickable lift themselves above
          the overlay.
        */}
        <Typography
          variant="h6"
          sx={{
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <AppLink
            to={`/public-events/${event.id}`}
            color="text.primary"
            sx={{
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
              },
            }}
          >
            {event.title}
          </AppLink>
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

        {/* `mt: auto` is what pins the value and the action to the foot of every
            card in the row, whatever the middle carries. */}
        <Divider sx={{ mt: 'auto', pt: 1.5 }} />
        <EventCardBudget budget={budgetLabel(event)} />

        <Divider sx={{ my: 1.5 }} />
        <EventCardActions eventId={event.id} actionable={actionable} interested={interested} />
      </CardContent>
    </Card>
  );
}

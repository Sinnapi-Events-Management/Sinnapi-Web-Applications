import { Card, CardContent, Chip, Divider, Stack, StatusChip, Typography } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { formatDate } from '@/lib/config';
import type { MyEventBudgetModel, MyEventModel } from '@/lib/types';
import EventBudgetRow from './EventBudgetRow';
import EventPaymentTermsRow from './EventPaymentTermsRow';

type Props = {
  event: MyEventModel;
  budget: MyEventBudgetModel | undefined;
  budgetLoading?: boolean;
};

/** One posted event, as a card in the events grid. */
export default function MyEventCard({ event, budget, budgetLoading }: Props) {
  return (
    <Card
      variant="outlined"
      // `position: relative` is what the stretched title link below anchors to.
      sx={{
        height: '100%',
        position: 'relative',
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
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          {/* Placeholder span keeps the status chip right-aligned when an event
              has no type to show. */}
          {/* The managed type carries its own display name, so there is nothing
              left to titleize — the chip reads exactly what the admin named it. */}
          {event.event_type ? <Chip size="small" label={event.event_type.name} /> : <span />}
          <StatusChip status={event.status} />
        </Stack>

        {/*
          A "stretched link": the anchor is the title, and its ::after covers the
          whole card so the entire surface is the click target.

          The alternative — wrapping the card in `CardActionArea` — cannot be
          used here, because the payment-terms row below contains a button, and a
          button inside a link is invalid HTML that assistive technology reports
          inconsistently and that swallows the inner control's activation. This
          way there is exactly ONE link in the accessibility tree, it is named by
          the event's own title rather than by the whole card's text, and any
          control that needs to stay independently clickable simply lifts itself
          above the overlay.
        */}
        <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
          <AppLink
            to={`/my-events/${event.id}`}
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

        <Typography variant="body2" color="text.secondary">
          {formatDate(event.event_date)} · {event.location ?? '—'}
        </Typography>

        {/* The budget is the reason this card exists as more than a label: it is
            the figure a client is scanning the grid to check. */}
        <Divider sx={{ my: 1.5 }} />
        <EventBudgetRow budget={budget} loading={budgetLoading} />

        {/* Above the stretched link's overlay, so the terms dialog still opens
            instead of navigating to the event. */}
        <Divider sx={{ my: 1.5 }} />
        <Stack sx={{ position: 'relative', zIndex: 1 }}>
          <EventPaymentTermsRow event={event} />
        </Stack>
      </CardContent>
    </Card>
  );
}

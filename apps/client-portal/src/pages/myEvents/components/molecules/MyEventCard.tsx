import { Card, CardContent, Chip, Divider, Stack, StatusChip, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { MyEventModel } from '@/lib/types';
import EventPaymentTermsRow from './EventPaymentTermsRow';

type Props = {
  event: MyEventModel;
};

/** One posted event, as a card in the events grid. */
export default function MyEventCard({ event }: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          {/* Placeholder span keeps the status chip right-aligned when an event
              has no type to show. */}
          {/* The managed type carries its own display name, so there is nothing
              left to titleize — the chip reads exactly what the admin named it. */}
          {event.event_type ? <Chip size="small" label={event.event_type.name} /> : <span />}
          <StatusChip status={event.status} />
        </Stack>
        <Typography variant="h6">{event.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatDate(event.event_date)} · {event.location ?? '—'}
        </Typography>

        {/* The terms belong on the card rather than behind a detail page,
            because an event has no detail page — and because they are the one
            thing here that binds bookings the client has not made yet. */}
        <Divider sx={{ my: 1.5 }} />
        <EventPaymentTermsRow event={event} />
      </CardContent>
    </Card>
  );
}

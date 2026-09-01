import { Divider, InfoRow, SectionCard, Stack, Typography } from '@sinnapi/ui';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { formatDate } from '@/lib/config';
import type { MyEventDetailModel } from '@/lib/types';
import EventPaymentTermsRow from '@/pages/myEvents/components/molecules/EventPaymentTermsRow';

type Props = { event: MyEventDetailModel };

/**
 * What the client told vendors about this event.
 *
 * States every field, including the ones the hero already showed. The hero
 * drops its supporting facts on a phone, so this card is where they are
 * guaranteed to be readable — which is the arrangement `HeroMeta` documents and
 * relies on.
 *
 * The payment-terms row is the one shared with the events grid rather than a
 * second copy. It owns its own dialog, so the terms are editable from here
 * exactly as they are from the card, and the two can never fall out of step
 * about what the terms mean.
 */
export default function EventDetailsCard({ event }: Props) {
  return (
    <SectionCard title="Event details" icon={<InfoOutlinedIcon />}>
      <Stack spacing={0.5}>
        <InfoRow label="Date" value={formatDate(event.event_date)} />
        <InfoRow label="Location" value={event.location ?? '—'} />
        <InfoRow label="Occasion" value={event.event_type?.name ?? 'Not specified'} />
      </Stack>

      {event.description && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            Brief
          </Typography>
          {/* `pre-wrap`: a client's brief carries the paragraphs they typed, and
              collapsing them turns a structured brief into a wall. */}
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
            {event.description}
          </Typography>
        </>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Payment terms for every booking under this event
      </Typography>
      <EventPaymentTermsRow event={event} />
    </SectionCard>
  );
}

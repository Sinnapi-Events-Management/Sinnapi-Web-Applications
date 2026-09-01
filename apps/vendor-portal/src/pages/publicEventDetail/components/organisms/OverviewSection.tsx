import { Divider, InfoRow, SectionCard, SectionGrid, Stack, Typography } from '@sinnapi/ui';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatDate } from '@/lib/config';
import { budgetLabel } from '@/lib/events';
import type { EventTypeRef, PublicEventDetailModel } from '@/lib/types';
import type { QuoteStanding } from '../../schema';
import QuoteStandingCallout from '../molecules/QuoteStandingCallout';

type Props = {
  event: PublicEventDetailModel;
  eventType: EventTypeRef | null;
  standing: QuoteStanding;
  actionable: boolean;
  interested: boolean;
  canExpressInterest: boolean;
};

/**
 * What the client asked for, and where this vendor stands on it.
 *
 * Every fact the hero shows is restated here as a labelled row. That is not
 * duplication — `HeroMeta` drops its supporting facts on a phone by design, so
 * this card is the only place the date and the venue are guaranteed to be
 * readable, and it is the arrangement the hero is written against.
 *
 * The standing sits in its own card at the top of the FIRST tab rather than
 * only under "Your quote". A vendor who opened this page from the feed came to
 * decide whether to bid, and burying "you started a quote and never sent it"
 * one tab away is how that quote stays unsent.
 *
 * The budget is the client's published range and nothing more. There is no
 * meter on this side of the deal and there cannot be — see `EventCardBudget`.
 */
export default function OverviewSection({
  event,
  eventType,
  standing,
  actionable,
  interested,
  canExpressInterest,
}: Props) {
  return (
    <Stack spacing={3}>
      <SectionCard title="Where you stand" icon={<InfoOutlinedIcon />}>
        <QuoteStandingCallout
          eventId={event.id}
          standing={standing}
          actionable={actionable}
          interested={interested}
          canExpressInterest={canExpressInterest}
        />
      </SectionCard>

      <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
        <SectionCard title="The brief" icon={<InfoOutlinedIcon />}>
          {event.description ? (
            // `pre-wrap`: the client's brief carries the paragraphs they typed,
            // and collapsing them turns a structured brief into a wall.
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {event.description}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              The client did not write a brief. The plan may say more about what they need.
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack spacing={0.5}>
            <InfoRow label="Date" value={event.event_date ? formatDate(event.event_date) : '—'} />
            <InfoRow label="Location" value={event.location ?? '—'} />
            <InfoRow label="Occasion" value={eventType?.name ?? 'Not specified'} />
            <InfoRow
              label="Posted"
              value={`${formatDate(event.created_at)} · ${
                event.source === 'client' ? 'by a client' : 'by Sinnapi'
              }`}
            />
          </Stack>
        </SectionCard>

        <SectionCard title="Budget" icon={<PaymentsIcon />} accent="success">
          <Typography variant="h5" fontWeight={700}>
            {budgetLabel(event) ?? 'Not stated'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {budgetLabel(event)
              ? 'What the client published for the whole event. Individual lines are not priced ' +
                'publicly, so quote for the work rather than to the ceiling.'
              : 'The client did not publish a figure. Price the work and say what it covers — a ' +
                'clear breakdown is what gets answered.'}
          </Typography>
        </SectionCard>
      </SectionGrid>
    </Stack>
  );
}

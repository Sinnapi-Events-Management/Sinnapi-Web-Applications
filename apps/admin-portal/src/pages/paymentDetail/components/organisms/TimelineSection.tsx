import { SectionCard, StatusTimeline, Typography, type StatusTimelineStep } from '@sinnapi/ui';
import HistoryIcon from '@mui/icons-material/History';
import { formatDateTime } from '@/lib/config';
import type { PaymentEventModel } from '@/lib/types';

type Props = { events: PaymentEventModel[] };

/**
 * Every delivery the provider made for this payment and what the webhook
 * handler did with it, oldest first.
 *
 * Each row is a `payment_events` record: the provider's own event id (the
 * idempotency gate), the outcome the handler recorded, and whether it was ever
 * processed. A delivery with no outcome and no processed-at is one the handler
 * gated but never finished — the signature of a crash mid-webhook, and the
 * first thing to look for on a stuck payment.
 */
export default function TimelineSection({ events }: Props) {
  const steps: StatusTimelineStep[] = events.map((ev) => ({
    key: ev.id,
    status: ev.outcome ?? (ev.processed_at ? 'processed' : 'received'),
    occurredAt: ev.received_at,
    reason: describe(ev),
    done: true,
  }));

  return (
    <SectionCard
      title="Provider deliveries"
      icon={<HistoryIcon />}
      subtitle="What the provider told us, in the order it arrived, and what we did with each notification."
    >
      {steps.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No provider notification has been received for this payment. A checkout that was never
          completed looks like this; so does an IPN that never reached us.
        </Typography>
      ) : (
        <StatusTimeline steps={steps} formatTimestamp={formatDateTime} />
      )}
    </SectionCard>
  );
}

function describe(ev: PaymentEventModel): string {
  const parts = [ev.event_type ?? 'delivery', `event ${ev.event_id}`];
  parts.push(ev.processed_at ? `processed ${formatDateTime(ev.processed_at)}` : 'not processed');
  return parts.join(' · ');
}

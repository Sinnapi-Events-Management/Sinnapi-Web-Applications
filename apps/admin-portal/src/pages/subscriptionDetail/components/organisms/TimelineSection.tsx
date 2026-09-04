import { SectionCard, StatusTimeline, Typography, type StatusTimelineStep } from '@sinnapi/ui';
import HistoryIcon from '@mui/icons-material/History';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { SubscriptionAdminEventModel } from '@/lib/types';
import { eventLabel } from '../../schema';

type Props = { events: SubscriptionAdminEventModel[] };

/**
 * Everything that has happened to this subscription, oldest first.
 *
 * Each row is a `subscription_events` record written by `subscription_notify`
 * in the same transaction as the change it describes, carrying the payment
 * that caused it where there was one. A payment id in the description is the
 * link from the event stream to the money, which is what this page exists to
 * make visible.
 */
export default function TimelineSection({ events }: Props) {
  const steps: StatusTimelineStep[] = events.map((ev) => ({
    key: ev.id,
    status: eventLabel(ev.event_type),
    occurredAt: ev.occurred_at,
    reason: describe(ev),
    done: true,
  }));

  return (
    <SectionCard
      title="Timeline"
      icon={<HistoryIcon />}
      subtitle="Every state change, reminder and payment attempt, in the order it happened."
    >
      {steps.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events have been recorded for this subscription.
        </Typography>
      ) : (
        <StatusTimeline steps={steps} formatTimestamp={formatDateTime} />
      )}
    </SectionCard>
  );
}

function describe(ev: SubscriptionAdminEventModel): string | null {
  const m = ev.metadata ?? {};
  const parts: string[] = [];

  const plan = typeof m.plan_name === 'string' ? m.plan_name : null;
  const kind = typeof m.change_kind === 'string' ? m.change_kind.replace(/_/g, ' ') : null;
  const amount = m.amount != null ? Number(m.amount) : null;
  const reason = typeof m.reason === 'string' ? m.reason : null;
  const day = m.reminder_day != null ? Number(m.reminder_day) : null;

  if (plan) parts.push(kind ? `${plan} (${kind})` : plan);
  if (amount != null && Number.isFinite(amount)) parts.push(formatMoney(amount));
  if (day != null) parts.push(`${day} day${day === 1 ? '' : 's'} before end`);
  if (reason) parts.push(reason);
  if (ev.payment_id) parts.push(`payment ${ev.payment_id.slice(0, 8)}…`);
  if (ev.actor_name) parts.push(`by ${ev.actor_name}`);

  return parts.length ? parts.join(' · ') : null;
}

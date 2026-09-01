import { bucketLabel, formatAge, toStatusSlices, type TrendPoint } from '@sinnapi/ui/analytics';
import { titleizeStatus } from '@sinnapi/ui';
import { formatMoney, formatRelative } from '@/lib/config';
import { QUEUES } from './queues';
import type {
  ActivityModel,
  ActivityRow,
  DashboardModel,
  EarningsModel,
  EarningsRow,
  PipelineModel,
  PipelineRow,
  QueueCardModel,
  QueueKey,
  QueueRow,
  ReputationModel,
  ReputationRow,
  UpcomingModel,
  UpcomingRow,
  VendorOverviewRow,
} from './types';

// Pure mapping from the RPC payload to what the components render. Keeping it
// here means every component below is presentational: it receives finished
// numbers, labels and series and never reaches back into the wire shape.

type Unit = 'day' | 'week' | 'month';

/** Convert an RPC bucket series into chart points with x-axis labels. */
function toTrend<T extends { bucket_start: string }>(
  rows: T[],
  unit: Unit,
  pick: (row: T) => Record<string, number>,
): TrendPoint[] {
  return rows.map((r) => ({ bucket: bucketLabel(r.bucket_start, unit), ...pick(r) }));
}

function toQueueCards(queues: Partial<Record<QueueKey, QueueRow>>): QueueCardModel[] {
  // Driven by QUEUES, not by the payload's key order, so the cards always read
  // in the intended working order regardless of what the RPC returned.
  return QUEUES.flatMap((def) => {
    const row = queues[def.key];
    if (!row) return [];
    return [
      {
        key: def.key,
        label: def.label,
        to: def.to,
        accent: def.accent,
        count: row.count,
        waiting: formatAge(row.oldest_at),
      },
    ];
  });
}

function toEarnings(row: EarningsRow, unit: Unit): EarningsModel {
  return {
    released: row.released,
    earned: row.earned,
    commission: row.commission,
    inEscrow: row.in_escrow,
    escrowCount: row.escrow_count,
    pendingPayout: row.pending_payout,
    lifetimeReleased: row.lifetime_released,
    trend: toTrend(row.trend ?? [], unit, (r) => ({
      released: r.released,
      earned: r.earned,
      commission: r.commission,
    })),
  };
}

function toPipeline(row: PipelineRow, unit: Unit): PipelineModel {
  return {
    bookings: row.bookings,
    quotations: row.quotations,
    bookingRequests: row.booking_requests,
    confirmed: row.confirmed,
    completed: row.completed,
    cancelled: row.cancelled,
    upcomingCount: row.upcoming_count,
    upcomingValue: row.upcoming_value,
    quotesAnswered: row.quotes_answered,
    quotesAccepted: row.quotes_accepted,
    // Null rather than 0% when nothing was answered: "no verdict yet" and
    // "every quote was turned down" are different answers, and 0% would read as
    // a crisis on a vendor's first quiet week.
    winRate: row.quotes_answered > 0 ? row.quotes_accepted / row.quotes_answered : null,
    trend: toTrend(row.trend ?? [], unit, (r) => ({
      bookings: r.bookings,
      quotations: r.quotations,
    })),
    statusMix: toStatusSlices(row.status_mix ?? []),
  };
}

function toReputation(row: ReputationRow): ReputationModel {
  return {
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: row.review_count,
    newReviews: row.new_reviews,
    unanswered: row.unanswered,
    // Star ratings are an ordered scale, not categories, so they stay a bar
    // chart over 5→1 rather than becoming coloured slices.
    ratingMix: [5, 4, 3, 2, 1].map((star) => ({
      bucket: `${star}★`,
      reviews: row.rating_mix?.find((m) => Number(m.name) === star)?.value ?? 0,
    })),
  };
}

/** Whole days from today to an event date, negative once it has passed. */
function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * How a diary entry reads. A vendor plans in "how long have I got", so the
 * countdown leads and the calendar date sits beside it as the precise fact.
 */
function countdownLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

function toUpcoming(rows: UpcomingRow[]): UpcomingModel[] {
  return rows.map((r) => ({
    id: r.id,
    to: `/bookings/${r.id}`,
    reference: r.reference_no,
    eventDate: new Date(`${r.event_date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    countdown: countdownLabel(r.event_date),
    status: r.status,
    amount: formatMoney(r.amount, r.currency),
    clientName: r.client_name ?? 'Client',
    location: r.location,
  }));
}

function toActivity(rows: ActivityRow[]): ActivityModel[] {
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    to: r.kind === 'booking' ? `/bookings/${r.entity_id}` : `/quotations/${r.entity_id}`,
    label: r.kind === 'booking' ? 'Booking' : 'Quotation',
    reference: r.reference_no,
    status: titleizeStatus(r.status),
    occurredAt: formatRelative(r.occurred_at),
  }));
}

/** The single mapping the data layer applies before anything renders. */
export function toDashboardModel(row: VendorOverviewRow, periodLabel: string): DashboardModel {
  const unit = row.granularity ?? 'day';
  return {
    generatedAt: row.generated_at,
    periodLabel,
    queues: toQueueCards(row.queues ?? {}),
    earnings: toEarnings(row.earnings, unit),
    pipeline: toPipeline(row.pipeline, unit),
    reputation: toReputation(row.reputation),
    upcoming: toUpcoming(row.upcoming ?? []),
    activity: toActivity(row.activity ?? []),
  };
}

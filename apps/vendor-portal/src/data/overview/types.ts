import type { BreakdownSlice, TrendPoint } from '@sinnapi/ui/analytics';

// The wire shape of `vendor_dashboard_overview`, and the view model the
// components below actually render. Postgres `numeric`/`bigint` arrive as JSON
// numbers here (jsonb_build_object casts them), timestamps as ISO strings.

export type QueueKey =
  | 'booking_requests'
  | 'quote_requests'
  | 'unpaid'
  | 'escrow'
  | 'payouts'
  | 'reviews';

/** One actionable queue as the RPC reports it. */
export type QueueRow = {
  count: number;
  /** Arrival time of the longest-waiting item, or null when the queue is clear. */
  oldest_at: string | null;
};

export type EarningsRow = {
  /** Payouts settled inside the window — cash that actually landed. */
  released: number;
  /** Work booked into escrow inside the window, paid out or not. */
  earned: number;
  commission: number;
  /** Vendor's share of everything still in custody right now. */
  in_escrow: number;
  escrow_count: number;
  pending_payout: number;
  lifetime_released: number;
  trend: Array<{
    bucket_start: string;
    released: number;
    earned: number;
    commission: number;
  }>;
};

export type PipelineRow = {
  bookings: number;
  quotations: number;
  booking_requests: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  upcoming_count: number;
  upcoming_value: number;
  /** Quotes that got an answer in the window — the base for the win rate. */
  quotes_answered: number;
  quotes_accepted: number;
  trend: Array<{ bucket_start: string; bookings: number; quotations: number }>;
  status_mix: Array<{ name: string; value: number }>;
};

export type ReputationRow = {
  avg_rating: number;
  review_count: number;
  new_reviews: number;
  unanswered: number;
  /** Published reviews grouped by star rating, "5" first. */
  rating_mix: Array<{ name: string; value: number }>;
};

export type UpcomingRow = {
  id: string;
  reference_no: string;
  event_date: string;
  status: string;
  amount: number;
  currency: string;
  start_time: string | null;
  location: string | null;
  client_name: string | null;
};

export type ActivityRow = {
  id: string;
  kind: 'booking' | 'quotation';
  entity_id: string;
  reference_no: string;
  status: string;
  occurred_at: string;
};

/** The whole RPC payload. */
export type VendorOverviewRow = {
  generated_at: string;
  period_days: number;
  granularity: 'day' | 'week' | 'month';
  queues: Partial<Record<QueueKey, QueueRow>>;
  earnings: EarningsRow;
  pipeline: PipelineRow;
  reputation: ReputationRow;
  upcoming: UpcomingRow[];
  activity: ActivityRow[];
};

// ---------- View model ----------

export type AccentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type QueueCardModel = {
  key: QueueKey;
  label: string;
  to: string;
  accent: AccentColor;
  count: number;
  /** Humanised age of the oldest waiting item, e.g. "3d 4h". */
  waiting: string | null;
};

export type EarningsModel = {
  released: number;
  earned: number;
  commission: number;
  inEscrow: number;
  escrowCount: number;
  pendingPayout: number;
  lifetimeReleased: number;
  trend: TrendPoint[];
};

export type PipelineModel = {
  bookings: number;
  quotations: number;
  bookingRequests: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  upcomingCount: number;
  upcomingValue: number;
  quotesAnswered: number;
  quotesAccepted: number;
  /** Accepted ÷ answered, or null when nothing was answered in the window. */
  winRate: number | null;
  trend: TrendPoint[];
  statusMix: BreakdownSlice[];
};

export type ReputationModel = {
  avgRating: number;
  reviewCount: number;
  newReviews: number;
  unanswered: number;
  ratingMix: TrendPoint[];
};

export type UpcomingModel = {
  id: string;
  to: string;
  reference: string;
  eventDate: string;
  /** "in 3 days" / "Tomorrow" — how the diary actually reads. */
  countdown: string;
  status: string;
  amount: string;
  clientName: string;
  location: string | null;
};

export type ActivityModel = {
  id: string;
  kind: ActivityRow['kind'];
  to: string;
  label: string;
  reference: string;
  status: string;
  occurredAt: string;
};

/** Everything the dashboard renders, in the shape it renders it. */
export type DashboardModel = {
  generatedAt: string;
  periodLabel: string;
  queues: QueueCardModel[];
  earnings: EarningsModel;
  pipeline: PipelineModel;
  reputation: ReputationModel;
  upcoming: UpcomingModel[];
  activity: ActivityModel[];
};

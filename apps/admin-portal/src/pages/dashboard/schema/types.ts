import type { BreakdownSlice, TrendPoint } from '@/lib/analytics';

// The wire shape of `admin_dashboard_overview`. Postgres `numeric`/`bigint`
// arrive as JSON numbers here (jsonb_build_object casts them), but every field a
// section is gated on may be absent, so optionality is modelled explicitly.

export type QueueBucket = { bucket_start: string; value: number };

/** One actionable work queue as the RPC reports it. */
export type QueueRow = {
  /** Live backlog: rows currently awaiting an admin. */
  count: number;
  /** Everything that entered the queue during the window. */
  inflow: number;
  /** Arrival time of the longest-waiting item, or null when the queue is clear. */
  oldest_at: string | null;
  /** Backlog items past their SLA (disputes only; 0 elsewhere). */
  overdue: number;
  trend: QueueBucket[];
};

export type TrialsRow = {
  /** Trials whose trial period finished inside the window — the measurable set. */
  ended: number;
  /** Of those, how many are now on a paying plan. */
  converted: number;
  /** Trials still running, which have no outcome yet. */
  ongoing: number;
};

export type SubscriptionRow = {
  /** Monthly-normalised recurring revenue at the newest bucket. */
  mrr: number;
  added: number;
  churned: number;
  active: number;
  trialing: number;
  /** MRR in a recoverable failure state (past_due + grace) right now. */
  mrr_at_risk: number;
  trials: TrialsRow;
  trend: Array<{ bucket_start: string; mrr: number; added: number; churned: number }>;
  /** Current MRR split by pricing plan. */
  plan_mix: Array<{ name: string; value: number }>;
  status_mix: Array<{ name: string; value: number }>;
};

export type FinanceRow = {
  gross: number;
  commission: number;
  refunds: number;
  escrow_held: number;
  escrow_count: number;
  trend: Array<{
    bucket_start: string;
    gross: number;
    commission: number;
    refunds: number;
  }>;
  payment_mix: Array<{ name: string; value: number }>;
};

export type VendorGrowthRow = {
  active: number;
  new: number;
  trend: Array<{ bucket_start: string; signups: number }>;
  status_mix: Array<{ name: string; value: number }>;
};

export type OperationsGrowthRow = {
  bookings: number;
  quotations: number;
  trend: Array<{ bucket_start: string; bookings: number; quotations: number }>;
  status_mix: Array<{ name: string; value: number }>;
};

export type UsersGrowthRow = { total: number; new: number };

export type ActivityRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: string;
  is_system: boolean;
  actor_name: string | null;
  /** Recognisable label pulled from the audited row snapshot, when one exists. */
  entity_summary: string | null;
};

/** The whole RPC payload. A null/absent section means "not permitted". */
export type DashboardOverviewRow = {
  generated_at: string;
  period_days: number;
  granularity: 'day' | 'week' | 'month';
  queues: Partial<Record<QueueKey, QueueRow>>;
  subscriptions: SubscriptionRow | null;
  finance: FinanceRow | null;
  growth: {
    vendors: VendorGrowthRow | null;
    operations: OperationsGrowthRow | null;
    users: UsersGrowthRow | null;
  } | null;
  activity: ActivityRow[] | null;
};

// ---------------------------------------------------------------------
// View models — what the components actually render.
// ---------------------------------------------------------------------

export type QueueKey = 'applications' | 'payouts' | 'disputes' | 'escrow' | 'refunds' | 'renewals';

/** A queue card, ready to render: definition + live figures, nothing to derive. */
export type QueueCardModel = {
  key: QueueKey;
  label: string;
  to: string;
  accent: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  count: number;
  overdue: number;
  /** Humanised age of the longest-waiting item, e.g. "3d 4h". */
  waiting: string | null;
};

export type SubscriptionModel = {
  mrr: number;
  added: number;
  churned: number;
  active: number;
  trialing: number;
  mrrAtRisk: number;
  /** Churned as a share of the base it churned out of, over the window. */
  churnRate: number;
  /** Converted ÷ ended, or null when no trial finished in the window. */
  trialConversion: number | null;
  trials: TrialsRow;
  trend: TrendPoint[];
  planMix: BreakdownSlice[];
  statusMix: BreakdownSlice[];
};

export type FinanceModel = {
  gross: number;
  commission: number;
  refunds: number;
  escrowHeld: number;
  escrowCount: number;
  /** Take rate: commission as a share of gross. */
  takeRate: number;
  trend: TrendPoint[];
  paymentMix: BreakdownSlice[];
};

export type GrowthModel = {
  vendors: {
    active: number;
    added: number;
    trend: TrendPoint[];
    statusMix: BreakdownSlice[];
  } | null;
  operations: {
    bookings: number;
    quotations: number;
    /** Share of quotations that became bookings in the window. */
    conversion: number;
    trend: TrendPoint[];
    statusMix: BreakdownSlice[];
  } | null;
  users: UsersGrowthRow | null;
};

export type ActivityModel = {
  id: string;
  /** Full sentence, e.g. "Updated a pricing plan". */
  label: string;
  accent: 'success' | 'warning' | 'error' | 'info';
  Icon: React.ComponentType<{ sx?: object }>;
  actor: string;
  /** Recognisable name of the affected record, when the snapshot carried one. */
  subject: string | null;
  occurredAt: string;
};

/**
 * The single figure the Overview leads with. Which metric this is depends on
 * what the admin can see, so the page always has a headline rather than a hole.
 */
export type HeroModel = {
  label: string;
  value: number;
  format: 'money' | 'number' | 'percent';
  delta: number | null;
  comparisonLabel: string;
  caption: string | null;
  accent: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Which metric was chosen — drives the icon at the render layer. */
  kind: 'mrr' | 'revenue' | 'workload';
  trend: TrendPoint[];
  trendKey: string;
};

export type DashboardModel = {
  generatedAt: string;
  /** Null only when the admin can see no headline metric at all. */
  hero: HeroModel | null;
  queues: QueueCardModel[];
  subscriptions: SubscriptionModel | null;
  finance: FinanceModel | null;
  growth: GrowthModel | null;
  activity: ActivityModel[] | null;
};

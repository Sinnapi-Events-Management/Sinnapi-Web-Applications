import {
  bucketLabel,
  formatAge,
  formatValue,
  halfPeriodDelta,
  seriesDelta,
  toSeriesSlices,
  toStatusSlices,
  type TrendPoint,
} from '@/lib/analytics';
import { describeAction } from '@/lib/audit';
import { formatRelative } from '@/lib/config';
import { QUEUES } from './queues';
import type { UnpaidBookingCounts } from '@/lib/types';
import type {
  ActivityModel,
  ActivityRow,
  DashboardModel,
  DashboardOverviewRow,
  FinanceModel,
  FinanceRow,
  GrowthModel,
  OperationsGrowthRow,
  QueueCardModel,
  QueueRow,
  SubscriptionModel,
  SubscriptionRow,
  VendorGrowthRow,
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

function toQueueCards(queues: Partial<Record<QueueCardModel['key'], QueueRow>>): QueueCardModel[] {
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
        overdue: row.overdue,
        waiting: formatAge(row.oldest_at),
      },
    ];
  });
}

function toSubscriptions(row: SubscriptionRow | null, unit: Unit): SubscriptionModel | null {
  if (!row) return null;

  // Churn over the window against the base it churned out of — the survivors
  // plus the leavers. Matches the Reports panel's definition.
  const base = row.active + row.churned;

  return {
    mrr: row.mrr,
    added: row.added,
    churned: row.churned,
    active: row.active,
    trialing: row.trialing,
    mrrAtRisk: row.mrr_at_risk,
    churnRate: base > 0 ? row.churned / base : 0,
    // Null rather than 0% when no trial finished: "no data" and "nobody
    // converted" are different answers, and 0% would read as a crisis.
    trialConversion: row.trials.ended > 0 ? row.trials.converted / row.trials.ended : null,
    trials: row.trials,
    trend: toTrend(row.trend ?? [], unit, (r) => ({
      mrr: r.mrr,
      added: r.added,
      churned: r.churned,
    })),
    planMix: toSeriesSlices(row.plan_mix ?? []),
    statusMix: toStatusSlices(row.status_mix ?? []),
  };
}

function toFinance(row: FinanceRow | null, unit: Unit): FinanceModel | null {
  if (!row) return null;
  return {
    gross: row.gross,
    commission: row.commission,
    refunds: row.refunds,
    escrowHeld: row.escrow_held,
    escrowCount: row.escrow_count,
    // Guard the divide: a window with no settled payments has no take rate.
    takeRate: row.gross > 0 ? row.commission / row.gross : 0,
    trend: toTrend(row.trend ?? [], unit, (r) => ({
      gross: r.gross,
      commission: r.commission,
      refunds: r.refunds,
    })),
    paymentMix: toStatusSlices(row.payment_mix ?? []),
  };
}

function toVendors(row: VendorGrowthRow | null, unit: Unit): GrowthModel['vendors'] {
  if (!row) return null;
  return {
    active: row.active,
    added: row.new,
    trend: toTrend(row.trend ?? [], unit, (r) => ({ signups: r.signups })),
    statusMix: toStatusSlices(row.status_mix ?? []),
  };
}

function toOperations(row: OperationsGrowthRow | null, unit: Unit): GrowthModel['operations'] {
  if (!row) return null;
  return {
    bookings: row.bookings,
    quotations: row.quotations,
    conversion: row.quotations > 0 ? row.bookings / row.quotations : 0,
    trend: toTrend(row.trend ?? [], unit, (r) => ({
      bookings: r.bookings,
      quotations: r.quotations,
    })),
    statusMix: toStatusSlices(row.status_mix ?? []),
  };
}

function toActivity(rows: ActivityRow[] | null): ActivityModel[] | null {
  if (!rows) return null;
  return rows.map((r) => {
    const action = describeAction(r.action, r.entity_type);
    return {
      id: r.id,
      label: action.label,
      accent: action.accent,
      Icon: action.Icon,
      actor: r.is_system ? 'System' : (r.actor_name ?? 'Unknown user'),
      subject: r.entity_summary,
      occurredAt: formatRelative(r.occurred_at),
    };
  });
}

/**
 * Choose the Overview's headline, in order of what the business leads on:
 * recurring plan revenue first, transactional income next, and — for an admin
 * with neither finance permission — the size of their own workload. There is
 * always exactly one hero, never a row of competing candidates.
 */
function toHero(
  subscriptions: SubscriptionModel | null,
  finance: FinanceModel | null,
  queues: QueueCardModel[],
  periodLabel: string,
): DashboardModel['hero'] {
  if (subscriptions) {
    const parts = [`${subscriptions.active.toLocaleString()} active`];
    if (subscriptions.trialing > 0)
      parts.push(`${subscriptions.trialing.toLocaleString()} on trial`);
    return {
      label: 'Monthly recurring revenue',
      value: subscriptions.mrr,
      format: 'money',
      delta: seriesDelta(subscriptions.trend, 'mrr'),
      comparisonLabel: `over ${periodLabel.toLowerCase()}`,
      caption: parts.join(' · '),
      accent: 'success',
      kind: 'mrr',
      trend: subscriptions.trend,
      trendKey: 'mrr',
    };
  }

  if (finance) {
    return {
      label: 'Gross revenue',
      value: finance.gross,
      format: 'money',
      delta: halfPeriodDelta(finance.trend, 'gross'),
      comparisonLabel: `vs first half of ${periodLabel.toLowerCase()}`,
      caption: `${formatValue(finance.commission, 'money')} commission earned`,
      accent: 'primary',
      kind: 'revenue',
      trend: finance.trend,
      trendKey: 'gross',
    };
  }

  if (queues.length) {
    const waiting = queues.reduce((acc, q) => acc + q.count, 0);
    const overdue = queues.reduce((acc, q) => acc + q.overdue, 0);
    return {
      label: 'Items awaiting you',
      value: waiting,
      format: 'number',
      delta: null,
      comparisonLabel: `across ${queues.length} queue${queues.length === 1 ? '' : 's'}`,
      caption: overdue > 0 ? `${overdue.toLocaleString()} past their SLA` : 'None past their SLA',
      accent: overdue > 0 ? 'error' : 'info',
      kind: 'workload',
      trend: [],
      trendKey: 'value',
    };
  }

  return null;
}

/**
 * Fold the unpaid-bookings card into the queue band.
 *
 * That queue is not part of `admin_dashboard_overview`, and deliberately so.
 * The RPC's queue helper is shaped around "count rows of table X in statuses
 * Y" — unpaid bookings are a join across a status, a settled-at stamp, an
 * overdue flag and a deadline that may be an admin's override, none of which
 * that shape expresses. Bending the helper to fit would have made every other
 * queue pay for this one; a second, dedicated count RPC costs one small query
 * on a page that already makes several.
 *
 * Re-sorted through `QUEUES` afterwards so the card lands in its intended
 * working position rather than wherever it was appended.
 */
export function mergeUnpaidQueue(
  queues: QueueCardModel[],
  counts: UnpaidBookingCounts | undefined,
): QueueCardModel[] {
  const def = QUEUES.find((q) => q.key === 'unpaid_bookings');
  // No counts means the query is still in flight or the admin lacks the
  // permission and it errored. Either way the card would be a confident zero,
  // which on this queue reads as "nothing to do" — so draw nothing instead.
  if (!def || !counts) return queues;

  const card: QueueCardModel = {
    key: def.key,
    label: def.label,
    to: def.to,
    accent: def.accent,
    // The backlog is everything unpaid; the overdue half is what the card
    // badges. Matching how the other queues read: count is the work, overdue
    // is the part that is late.
    count: counts.awaiting + counts.overdue,
    overdue: counts.overdue,
    waiting: formatAge(counts.oldest_overdue_at),
  };

  const merged = [...queues.filter((q) => q.key !== 'unpaid_bookings'), card];
  const order = new Map(QUEUES.map((q, i) => [q.key, i]));
  return merged.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
}

export function toDashboardModel(
  row: DashboardOverviewRow,
  /** Window name, woven into the hero's comparison caption. */
  periodLabel: string,
): DashboardModel {
  const unit = row.granularity;
  const queues = toQueueCards(row.queues ?? {});
  const subscriptions = toSubscriptions(row.subscriptions, unit);
  const finance = toFinance(row.finance, unit);

  return {
    generatedAt: row.generated_at,
    hero: toHero(subscriptions, finance, queues, periodLabel),
    queues,
    subscriptions,
    finance,
    growth: row.growth
      ? {
          vendors: toVendors(row.growth.vendors, unit),
          operations: toOperations(row.growth.operations, unit),
          users: row.growth.users,
        }
      : null,
    activity: toActivity(row.activity),
  };
}

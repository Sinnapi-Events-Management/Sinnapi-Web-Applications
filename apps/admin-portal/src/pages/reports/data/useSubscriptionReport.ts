import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { statusColor } from '@/lib/status';
import { formatMoney, titleize } from '@/lib/config';
import {
  getPeriodOption,
  type BreakdownSlice,
  type Kpi,
  type ReportPeriod,
  type ReportState,
  type TrendPoint,
} from '../schema';
import { toSeriesColor } from './helpers';
import { bucketLabel, seriesDelta, sumSeries } from '../format';

export type SubscriptionReport = {
  kpis: Kpi[];
  /** Monthly recurring revenue per bucket (area). */
  mrr: TrendPoint[];
  /** New vs churned subscriptions per bucket (grouped bar). */
  churnFlow: TrendPoint[];
  /** Subscriptions grouped by status (donut). */
  statusMix: BreakdownSlice[];
};

type MetricsRow = { bucket_start: string; added: string; churned: string; mrr: string };
type StatusRow = { status: string; total: string | number };

// All figures are live: `report_subscription_metrics` returns added / churned /
// MRR per bucket and `report_subscription_status` counts subscriptions by
// status — both gated on `subscriptions.manage`.
async function load(period: ReportPeriod): Promise<SubscriptionReport> {
  const { days, unit } = getPeriodOption(period);

  const [metricsRes, statusRes] = await Promise.all([
    supabase.rpc('report_subscription_metrics', { p_days: days, p_granularity: unit }),
    supabase.rpc('report_subscription_status'),
  ]);
  if (metricsRes.error) throw metricsRes.error;
  if (statusRes.error) throw statusRes.error;

  const rows = (metricsRes.data ?? []) as MetricsRow[];
  const mrr: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    mrr: Number(r.mrr),
  }));
  const churnFlow: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    added: Number(r.added),
    churned: Number(r.churned),
  }));

  const statusMix: BreakdownSlice[] = ((statusRes.data ?? []) as StatusRow[])
    .map((r) => ({
      name: titleize(r.status),
      value: Number(r.total),
      color: toSeriesColor(statusColor(r.status)),
    }))
    .filter((s) => s.value > 0);

  const findStatus = (name: string) =>
    statusMix.find((s) => s.name.toLowerCase() === name)?.value ?? 0;
  const active = findStatus('active');
  const trialing = findStatus('trialing');
  const churned = sumSeries(churnFlow, 'churned');
  const churnRate = active + churned > 0 ? churned / (active + churned) : 0;
  const latestMrr = mrr.length ? Number(mrr[mrr.length - 1].mrr) : 0;

  const kpis: Kpi[] = [
    {
      key: 'mrr',
      label: 'Recurring revenue',
      value: latestMrr,
      format: 'money',
      delta: seriesDelta(mrr, 'mrr'),
    },
    { key: 'active', label: 'Active subscriptions', value: active, format: 'number', delta: null },
    { key: 'trialing', label: 'On trial', value: trialing, format: 'number', delta: null },
    {
      key: 'churn',
      label: 'Churn rate',
      value: churnRate,
      format: 'percent',
      delta: seriesDelta(churnFlow, 'churned'),
      invertDelta: true,
    },
  ];

  return { kpis, mrr, churnFlow, statusMix };
}

export function useSubscriptionReport(period: ReportPeriod): ReportState<SubscriptionReport> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'subscriptions', period],
    queryFn: () => load(period),
  });

  return {
    data,
    isLoading,
    error,
    tables: data
      ? [
          {
            name: 'MRR trend',
            columns: ['Period', 'MRR'],
            rows: data.mrr.map((p) => [String(p.bucket), formatMoney(Number(p.mrr))]),
          },
          {
            name: 'Subscription flow',
            columns: ['Period', 'Added', 'Churned'],
            rows: data.churnFlow.map((p) => [String(p.bucket), Number(p.added), Number(p.churned)]),
          },
          {
            name: 'Subscription status',
            columns: ['Status', 'Subscriptions'],
            rows: data.statusMix.map((s) => [s.name, s.value]),
          },
        ]
      : [],
  };
}

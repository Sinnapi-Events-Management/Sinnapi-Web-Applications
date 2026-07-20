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

export type RevenueReport = {
  kpis: Kpi[];
  /** Gross + commission per bucket (area chart). */
  trend: TrendPoint[];
  /** Refunds per bucket (bar chart). */
  refunds: TrendPoint[];
  /** Payments grouped by status within the window (donut). */
  statusMix: BreakdownSlice[];
};

// Rows as returned by the SQL RPCs. Postgres `numeric`/`bigint` arrive as
// strings over the wire, so every figure is coerced with Number() below.
type TrendRow = { bucket_start: string; gross: string; commission: string; refunds: string };
type StatusMixRow = { status: string; total: string | number };
// All figures are live: `report_revenue_trend` aggregates payments / escrow /
// refunds into a zero-filled time series, and `report_payment_status_mix`
// counts payments by status — both gated on `finance.read`.
async function load(period: ReportPeriod): Promise<RevenueReport> {
  const { days, unit } = getPeriodOption(period);

  const [trendRes, mixRes] = await Promise.all([
    supabase.rpc('report_revenue_trend', { p_days: days, p_granularity: unit }),
    supabase.rpc('report_payment_status_mix', { p_days: days }),
  ]);
  if (trendRes.error) throw trendRes.error;
  if (mixRes.error) throw mixRes.error;

  const rows = (trendRes.data ?? []) as TrendRow[];
  const trend: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    gross: Number(r.gross),
    commission: Number(r.commission),
  }));
  const refunds: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    refunds: Number(r.refunds),
  }));

  const statusMix: BreakdownSlice[] = ((mixRes.data ?? []) as StatusMixRow[])
    .map((r) => ({
      name: titleize(r.status),
      value: Number(r.total),
      color: toSeriesColor(statusColor(r.status)),
    }))
    .filter((s) => s.value > 0);

  const gross = sumSeries(trend, 'gross');
  const commission = sumSeries(trend, 'commission');
  const refundTotal = sumSeries(refunds, 'refunds');

  const kpis: Kpi[] = [
    {
      key: 'gross',
      label: 'Gross revenue',
      value: gross,
      format: 'money',
      delta: seriesDelta(trend, 'gross'),
    },
    {
      key: 'commission',
      label: 'Commission earned',
      value: commission,
      format: 'money',
      delta: seriesDelta(trend, 'commission'),
    },
    {
      key: 'net',
      label: 'Net of refunds',
      value: gross - refundTotal,
      format: 'money',
      delta: seriesDelta(trend, 'gross'),
    },
    {
      key: 'refunds',
      label: 'Refunds issued',
      value: refundTotal,
      format: 'money',
      delta: seriesDelta(refunds, 'refunds'),
      invertDelta: true,
    },
  ];

  return { kpis, trend, refunds, statusMix };
}

export function useRevenueReport(period: ReportPeriod): ReportState<RevenueReport> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'revenue', period],
    queryFn: () => load(period),
  });

  return {
    data,
    isLoading,
    error,
    tables: data
      ? [
          {
            name: 'Revenue trend',
            columns: ['Period', 'Gross revenue', 'Commission'],
            rows: data.trend.map((p) => [
              String(p.bucket),
              formatMoney(Number(p.gross)),
              formatMoney(Number(p.commission)),
            ]),
          },
          {
            name: 'Refunds',
            columns: ['Period', 'Refunds'],
            rows: data.refunds.map((p) => [String(p.bucket), formatMoney(Number(p.refunds))]),
          },
          {
            name: 'Payment status mix',
            columns: ['Status', 'Payments'],
            rows: data.statusMix.map((s) => [s.name, s.value]),
          },
        ]
      : [],
  };
}

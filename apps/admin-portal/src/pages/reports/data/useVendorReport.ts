import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { statusColor } from '@/lib/status';
import { titleize } from '@/lib/config';
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

export type VendorReport = {
  kpis: Kpi[];
  /** New vendor signups per bucket (bar). */
  signups: TrendPoint[];
  /** Running total of vendors over the window (area). */
  cumulative: TrendPoint[];
  /** Vendors grouped by lifecycle status (donut). */
  statusMix: BreakdownSlice[];
};

type GrowthRow = { bucket_start: string; signups: string; cumulative: string };
type StatusRow = { status: string; total: string | number };

// All figures are live: `report_vendor_growth` returns signups + running total
// per bucket, and `report_vendor_status` counts vendors by status — both gated
// on `vendor.manage`.
async function load(period: ReportPeriod): Promise<VendorReport> {
  const { days, unit } = getPeriodOption(period);

  const [growthRes, statusRes] = await Promise.all([
    supabase.rpc('report_vendor_growth', { p_days: days, p_granularity: unit }),
    supabase.rpc('report_vendor_status'),
  ]);
  if (growthRes.error) throw growthRes.error;
  if (statusRes.error) throw statusRes.error;

  const rows = (growthRes.data ?? []) as GrowthRow[];
  const signups: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    signups: Number(r.signups),
  }));
  const cumulative: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    total: Number(r.cumulative),
  }));

  const statusMix: BreakdownSlice[] = ((statusRes.data ?? []) as StatusRow[])
    .map((r) => ({
      name: titleize(r.status),
      value: Number(r.total),
      color: toSeriesColor(statusColor(r.status)),
    }))
    .filter((s) => s.value > 0);

  const total = statusMix.reduce((acc, s) => acc + s.value, 0);
  const active = statusMix.find((s) => s.name.toLowerCase() === 'active')?.value ?? 0;
  const totalNew = sumSeries(signups, 'signups');

  // Growth rate needs its own series: signups against the roster they were added
  // to, per bucket. Showing the signup count's delta instead claimed the *rate*
  // moved by however much the count did, which is only true on a roster that
  // never grows — the same twenty signups are a smaller rate each period as the
  // base compounds, which is the whole point of measuring a rate.
  const growthRate: TrendPoint[] = signups.map((p, i) => {
    const base = Number(cumulative[i]?.total ?? 0);
    return { bucket: String(p.bucket), rate: base > 0 ? Number(p.signups) / base : 0 };
  });

  const kpis: Kpi[] = [
    {
      key: 'total',
      label: 'Total vendors',
      value: total,
      format: 'number',
      delta: seriesDelta(cumulative, 'total'),
      noDeltaLabel: 'No comparison yet',
    },
    {
      key: 'active',
      label: 'Active vendors',
      value: active,
      format: 'number',
      delta: null,
      noDeltaLabel: 'Live total',
    },
    {
      key: 'new',
      label: 'New this period',
      value: totalNew,
      format: 'number',
      delta: seriesDelta(signups, 'signups'),
      noDeltaLabel: 'No comparison yet',
    },
    {
      key: 'rate',
      label: 'Growth rate',
      value: total > 0 ? totalNew / total : 0,
      format: 'percent',
      delta: seriesDelta(growthRate, 'rate'),
      noDeltaLabel: 'No comparison yet',
    },
  ];

  return { kpis, signups, cumulative, statusMix };
}

export function useVendorReport(period: ReportPeriod): ReportState<VendorReport> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'vendors', period],
    queryFn: () => load(period),
  });

  return {
    data,
    isLoading,
    error,
    tables: data
      ? [
          {
            name: 'Vendor signups',
            columns: ['Period', 'New signups', 'Cumulative total'],
            rows: data.signups.map((p, i) => [
              String(p.bucket),
              Number(p.signups),
              Number(data.cumulative[i]?.total ?? 0),
            ]),
          },
          {
            name: 'Vendor status',
            columns: ['Status', 'Vendors'],
            rows: data.statusMix.map((s) => [s.name, s.value]),
          },
        ]
      : [],
  };
}

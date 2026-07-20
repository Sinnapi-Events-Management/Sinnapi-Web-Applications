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

export type OperationsReport = {
  kpis: Kpi[];
  /** Bookings + quotations created per bucket (grouped bar). */
  volume: TrendPoint[];
  /** Disputes opened vs resolved per bucket (line). */
  disputes: TrendPoint[];
  /** Bookings grouped by status (donut). */
  statusMix: BreakdownSlice[];
};

type TrendRow = {
  bucket_start: string;
  bookings: string;
  quotations: string;
  opened: string;
  resolved: string;
};
type SnapshotRow = { bookings_total: string; escrow_in_flight: string; open_disputes: string };
type StatusRow = { status: string; total: string | number };

// All figures are live: `report_operations_trend` returns booking/quotation and
// dispute flow per bucket, `report_operations_snapshot` the current scalar
// counts, and `report_booking_status` the status split — all gated on
// `bookings.read`.
async function load(period: ReportPeriod): Promise<OperationsReport> {
  const { days, unit } = getPeriodOption(period);

  const [trendRes, snapshotRes, statusRes] = await Promise.all([
    supabase.rpc('report_operations_trend', { p_days: days, p_granularity: unit }),
    supabase.rpc('report_operations_snapshot'),
    supabase.rpc('report_booking_status'),
  ]);
  if (trendRes.error) throw trendRes.error;
  if (snapshotRes.error) throw snapshotRes.error;
  if (statusRes.error) throw statusRes.error;

  const rows = (trendRes.data ?? []) as TrendRow[];
  const volume: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    bookings: Number(r.bookings),
    quotations: Number(r.quotations),
  }));
  const disputes: TrendPoint[] = rows.map((r) => ({
    bucket: bucketLabel(r.bucket_start, unit),
    opened: Number(r.opened),
    resolved: Number(r.resolved),
  }));

  const snap = ((snapshotRes.data ?? []) as SnapshotRow[])[0];
  const statusMix: BreakdownSlice[] = ((statusRes.data ?? []) as StatusRow[])
    .map((r) => ({
      name: titleize(r.status),
      value: Number(r.total),
      color: toSeriesColor(statusColor(r.status)),
    }))
    .filter((s) => s.value > 0);

  const openedTotal = sumSeries(disputes, 'opened');
  const resolvedTotal = sumSeries(disputes, 'resolved');

  const kpis: Kpi[] = [
    {
      key: 'bookings',
      label: 'Total bookings',
      value: Number(snap?.bookings_total ?? 0),
      format: 'number',
      delta: seriesDelta(volume, 'bookings'),
    },
    {
      key: 'escrow',
      label: 'Escrow in flight',
      value: Number(snap?.escrow_in_flight ?? 0),
      format: 'number',
      delta: null,
    },
    {
      key: 'disputes',
      label: 'Open disputes',
      value: Number(snap?.open_disputes ?? 0),
      format: 'number',
      delta: seriesDelta(disputes, 'opened'),
      invertDelta: true,
    },
    {
      key: 'resolution',
      label: 'Resolution rate',
      value: openedTotal > 0 ? resolvedTotal / openedTotal : 0,
      format: 'percent',
      delta: seriesDelta(disputes, 'resolved'),
    },
  ];

  return { kpis, volume, disputes, statusMix };
}

export function useOperationsReport(period: ReportPeriod): ReportState<OperationsReport> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'operations', period],
    queryFn: () => load(period),
  });

  return {
    data,
    isLoading,
    error,
    tables: data
      ? [
          {
            name: 'Booking volume',
            columns: ['Period', 'Bookings', 'Quotations'],
            rows: data.volume.map((p) => [
              String(p.bucket),
              Number(p.bookings),
              Number(p.quotations),
            ]),
          },
          {
            name: 'Disputes',
            columns: ['Period', 'Opened', 'Resolved'],
            rows: data.disputes.map((p) => [
              String(p.bucket),
              Number(p.opened),
              Number(p.resolved),
            ]),
          },
          {
            name: 'Booking status',
            columns: ['Status', 'Bookings'],
            rows: data.statusMix.map((s) => [s.name, s.value]),
          },
        ]
      : [],
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { statusColor } from '@/lib/status';
import { titleize } from '@/lib/config';
import { HALF_PERIOD } from '@sinnapi/ui/analytics';
import {
  getPeriodOption,
  type BreakdownSlice,
  type Kpi,
  type ReportPeriod,
  type ReportState,
  type TrendPoint,
} from '../schema';
import { toSeriesColor } from './helpers';
import { bucketLabel, ratioDelta, sumSeries } from '../format';

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
      // An all-time count from the snapshot RPC, not a windowed one. It used to
      // carry the delta of bookings *created in the window*, which described a
      // different figure entirely — a quiet fortnight cannot move a lifetime
      // total by the rate new bookings moved. The window's own volume is the
      // chart directly below.
      label: 'Total bookings',
      value: Number(snap?.bookings_total ?? 0),
      format: 'number',
      delta: null,
      noDeltaLabel: 'All time',
    },
    {
      key: 'escrow',
      label: 'Escrow in flight',
      value: Number(snap?.escrow_in_flight ?? 0),
      format: 'number',
      delta: null,
      noDeltaLabel: 'Live total',
    },
    {
      key: 'disputes',
      // A live count of what is open right now, so the flow of disputes *opened*
      // is not its delta: disputes opened and closed inside the window move that
      // series without changing this figure at all.
      label: 'Open disputes',
      value: Number(snap?.open_disputes ?? 0),
      format: 'number',
      delta: null,
      noDeltaLabel: 'Live total',
      invertDelta: true,
    },
    {
      key: 'resolution',
      label: 'Resolution rate',
      value: openedTotal > 0 ? resolvedTotal / openedTotal : 0,
      format: 'percent',
      // The rate's own movement, not the resolution count's: resolving more
      // disputes out of many more opened is the count up and the rate down.
      // Rates compare by halves, so this tile names its own comparison rather
      // than inheriting the row's period-start caption.
      delta: ratioDelta(disputes, 'resolved', 'opened'),
      comparisonLabel: HALF_PERIOD.label,
      comparisonHint: HALF_PERIOD.hint,
      noDeltaLabel: 'No comparison yet',
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

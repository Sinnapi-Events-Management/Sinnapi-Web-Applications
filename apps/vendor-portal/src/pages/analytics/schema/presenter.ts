import { toSeriesSlices, type TrendPoint } from '@sinnapi/ui/analytics';
import { formatMoney } from '@/lib/config';
import type {
  AnalyticsModel,
  ClientsModel,
  ClientsWire,
  LeadTimeModel,
  LeadTimeWire,
  PackageRowWire,
  RankedItem,
  ServiceRowWire,
  SpeedModel,
  SpeedWire,
  VendorAnalyticsRow,
} from './types';

// Pure mapping from the RPC payload to what the panels render. Every component
// downstream receives finished numbers, labels and series and never reaches
// back into the wire shape.

/**
 * Month label for a seasonality bucket.
 *
 * The RPC returns `bucket_start` as a bare `date` ("2026-08-01"), and
 * `new Date()` parses a date-only string as UTC midnight — which renders as the
 * previous month in any timezone west of UTC, silently shifting the whole
 * twelve-month chart by one bar. Pinned to local midnight instead, the same way
 * the dashboard parses `event_date`. The regex guard means a full timestamp,
 * should the RPC ever return one, is still parsed correctly.
 */
function monthLabel(value: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short' });
}

/** Short duration for a median measured in hours: "40m", "6h", "2d 4h". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

/** The median lead time the way a vendor would say it out loud. */
function leadTimeHeadline(medianDays: number | null, sample: number): string {
  if (medianDays == null || sample === 0) return 'Not enough bookings yet';
  const d = Math.round(medianDays);
  if (d < 7) return `${d === 1 ? '1 day' : `${d} days`} ahead`;
  if (d < 60) return `${Math.round(d / 7)} weeks ahead`;
  return `${Math.round(d / 30)} months ahead`;
}

/**
 * Turn a ranked list into display rows. `share` is against the list's own
 * total, so the bars compare the rows shown to each other — the RPC returns a
 * top-N, and computing the share against an unknown grand total would draw
 * bars that never fill.
 */
function toRanked<T>(
  rows: T[],
  pick: (row: T, index: number) => Omit<RankedItem, 'share'> & { weight: number },
): RankedItem[] {
  const mapped = rows.map(pick);
  const total = mapped.reduce((acc, r) => acc + Math.max(0, r.weight), 0);
  return mapped.map(({ weight, ...rest }) => ({
    ...rest,
    share: total > 0 ? Math.max(0, weight) / total : 0,
  }));
}

function toServices(rows: ServiceRowWire[]): RankedItem[] {
  return toRanked(rows, (r, i) => ({
    key: `${r.name}-${i}`,
    name: r.name,
    value: formatMoney(r.revenue),
    meta: `${r.bookings.toLocaleString()} ${r.bookings === 1 ? 'booking' : 'bookings'}`,
    weight: r.revenue,
  }));
}

function toPackages(rows: PackageRowWire[]): RankedItem[] {
  return toRanked(rows, (r, i) => {
    // Win rate per package is the reason this list is worth reading: it says
    // which tier to re-price, where a headline revenue figure only says which
    // one is selling.
    const win = r.quotes > 0 ? Math.round((r.accepted / r.quotes) * 100) : null;
    return {
      key: `${r.name}-${i}`,
      name: r.name,
      value: formatMoney(r.revenue),
      meta:
        `${r.quotes.toLocaleString()} ${r.quotes === 1 ? 'quote' : 'quotes'}` +
        (win === null ? '' : ` · ${win}% won`),
      weight: r.revenue,
    };
  });
}

function toClients(row: ClientsWire | undefined): ClientsModel {
  const top = toRanked(row?.top ?? [], (r, i) => ({
    key: `${r.name}-${i}`,
    name: r.name,
    value: formatMoney(r.value),
    meta: `${r.bookings.toLocaleString()} ${r.bookings === 1 ? 'booking' : 'bookings'}`,
    weight: r.value,
  }));

  return {
    total: row?.total ?? 0,
    repeat: row?.repeat ?? 0,
    repeatRate: row?.repeat_rate ?? null,
    newClients: row?.new_clients ?? 0,
    top,
  };
}

function toLeadTime(row: LeadTimeWire | undefined): LeadTimeModel {
  const medianDays = row?.median_days ?? null;
  const sample = row?.sample ?? 0;
  return {
    medianDays,
    sample,
    // The RPC zero-fills the bands, so this keeps their order and renders an
    // empty distribution as five flat bars rather than a missing chart.
    buckets: (row?.buckets ?? []).map((b) => ({ bucket: b.name, bookings: b.value })),
    headline: leadTimeHeadline(medianDays, sample),
  };
}

function toSpeed(row: SpeedWire | undefined): SpeedModel {
  return {
    quoteMedianHours: row?.quote_median_hours ?? null,
    quoteLabel: formatHours(row?.quote_median_hours),
    quotesPriced: row?.quotes_priced ?? 0,
    replyMedianHours: row?.reply_median_hours ?? null,
    replyLabel: formatHours(row?.reply_median_hours),
    replies: row?.replies ?? 0,
    published: row?.published ?? 0,
    replyRate: row?.reply_rate ?? null,
  };
}

function toSeasonality(rows: VendorAnalyticsRow['seasonality']): TrendPoint[] {
  return (rows ?? []).map((r) => ({
    bucket: monthLabel(r.bucket_start),
    bookings: r.bookings,
    revenue: r.revenue,
  }));
}

/** The single mapping the data layer applies before anything renders. */
export function toAnalyticsModel(row: VendorAnalyticsRow): AnalyticsModel {
  return {
    generatedAt: row.generated_at,
    services: toServices(row.services ?? []),
    packages: toPackages(row.packages ?? []),
    // Event types carry no status semantics, so they cycle the palette rather
    // than borrowing the status colours the booking mix uses.
    eventTypes: toSeriesSlices(row.event_types ?? []),
    leadTime: toLeadTime(row.lead_time),
    speed: toSpeed(row.speed),
    clients: toClients(row.clients),
    seasonality: toSeasonality(row.seasonality),
  };
}

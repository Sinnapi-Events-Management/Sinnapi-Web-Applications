import type { ReportTable } from '@sinnapi/ui/export';
import type { DashboardModel } from '@/data/overview';
import type { AnalyticsModel } from './types';
import type { AnalyticsTab } from './tabs';

/**
 * The export side of every panel: the same rows the charts are drawn from,
 * flattened one table per dataset.
 *
 * Built from the view models rather than from the wire payloads on purpose —
 * an export that re-derived its own figures could disagree with the chart
 * above it, which is the one thing a document a vendor sends to their
 * accountant must never do.
 *
 * Money is written as raw numbers, not formatted strings: the point of the
 * spreadsheet is that the recipient can sum the column. Amounts are in the
 * vendor's settlement currency, which the PDF states in its header.
 */
type TabTables = Record<AnalyticsTab, ReportTable[]>;

const EMPTY: TabTables = { earnings: [], demand: [], clients: [], reputation: [] };

function earningsTables(overview: DashboardModel): ReportTable[] {
  const { earnings } = overview;
  return [
    {
      name: 'Earnings trend',
      columns: ['Period', 'Booked into escrow', 'Paid out', 'Commission'],
      rows: earnings.trend.map((p) => [
        String(p.bucket),
        Number(p.earned) || 0,
        Number(p.released) || 0,
        Number(p.commission) || 0,
      ]),
    },
    {
      name: 'Balances',
      columns: ['Balance', 'Amount'],
      rows: [
        ['Held in escrow', earnings.inEscrow],
        ['Funded bookings in escrow', earnings.escrowCount],
        ['Payouts in flight', earnings.pendingPayout],
        ['Paid out all time', earnings.lifetimeReleased],
      ],
    },
  ];
}

function demandTables(overview: DashboardModel, detail: AnalyticsModel): ReportTable[] {
  const { pipeline } = overview;
  return [
    {
      name: 'Demand trend',
      columns: ['Period', 'Quote requests', 'Bookings'],
      rows: pipeline.trend.map((p) => [
        String(p.bucket),
        Number(p.quotations) || 0,
        Number(p.bookings) || 0,
      ]),
    },
    {
      name: 'Quote outcomes',
      columns: ['Measure', 'Value'],
      rows: [
        ['Quotes answered', pipeline.quotesAnswered],
        ['Quotes accepted', pipeline.quotesAccepted],
        ['Win rate', pipeline.winRate === null ? 'n/a' : `${Math.round(pipeline.winRate * 100)}%`],
        ['Median hours to price a request', detail.speed.quoteMedianHours ?? 'n/a'],
        ['Quotes priced in period', detail.speed.quotesPriced],
      ],
    },
    {
      name: 'Booking outcomes',
      columns: ['Status', 'Bookings'],
      rows: pipeline.statusMix.map((s) => [s.name, s.value]),
    },
    {
      name: 'Booking lead time',
      columns: ['Booked ahead by', 'Bookings'],
      rows: detail.leadTime.buckets.map((b) => [String(b.bucket), Number(b.bookings) || 0]),
    },
  ];
}

function clientTables(detail: AnalyticsModel): ReportTable[] {
  return [
    {
      name: 'Top services',
      columns: ['Service', 'Revenue', 'Share'],
      rows: detail.services.map((s) => [s.name, s.value, `${Math.round(s.share * 100)}%`]),
    },
    {
      name: 'Top packages',
      columns: ['Package', 'Revenue', 'Detail'],
      rows: detail.packages.map((p) => [p.name, p.value, p.meta]),
    },
    {
      name: 'Event types',
      columns: ['Event type', 'Bookings'],
      rows: detail.eventTypes.map((e) => [e.name, e.value]),
    },
    {
      name: 'Clients',
      columns: ['Measure', 'Value'],
      rows: [
        ['Total clients', detail.clients.total],
        ['Repeat clients', detail.clients.repeat],
        [
          'Repeat rate',
          detail.clients.repeatRate === null
            ? 'n/a'
            : `${Math.round(detail.clients.repeatRate * 100)}%`,
        ],
        ['New this period', detail.clients.newClients],
      ],
    },
    {
      name: 'Top clients',
      columns: ['Client', 'Lifetime value', 'Bookings'],
      rows: detail.clients.top.map((c) => [c.name, c.value, c.meta]),
    },
    {
      name: 'Seasonality (12 months)',
      columns: ['Month', 'Bookings', 'Value'],
      rows: detail.seasonality.map((p) => [
        String(p.bucket),
        Number(p.bookings) || 0,
        Number(p.revenue) || 0,
      ]),
    },
  ];
}

function reputationTables(overview: DashboardModel, detail: AnalyticsModel): ReportTable[] {
  const { reputation } = overview;
  return [
    {
      name: 'Reputation',
      columns: ['Measure', 'Value'],
      rows: [
        ['Average rating', reputation.avgRating],
        ['Published reviews', reputation.reviewCount],
        ['New this period', reputation.newReviews],
        ['Awaiting a reply', reputation.unanswered],
        [
          'Reply rate',
          detail.speed.replyRate === null ? 'n/a' : `${Math.round(detail.speed.replyRate * 100)}%`,
        ],
        ['Median hours to reply', detail.speed.replyMedianHours ?? 'n/a'],
      ],
    },
    {
      name: 'Rating distribution',
      columns: ['Rating', 'Reviews'],
      rows: reputation.ratingMix.map((r) => [String(r.bucket), Number(r.reviews) || 0]),
    },
  ];
}

/**
 * Every table on the page, grouped by the tab it belongs to. The toolbar
 * exports the flattened set; each card exports only its own.
 *
 * Returns empty groups until *both* reads have resolved — a half-populated
 * export is worse than a disabled button, because the gap is invisible once
 * the file has left the browser.
 */
export function buildTables(
  overview: DashboardModel | undefined,
  detail: AnalyticsModel | undefined,
): TabTables {
  if (!overview || !detail) return EMPTY;
  return {
    earnings: earningsTables(overview),
    demand: demandTables(overview, detail),
    clients: clientTables(detail),
    reputation: reputationTables(overview, detail),
  };
}

/** Pull named tables out of a group, for a single card's export menu. */
export function pickTables(tables: ReportTable[], ...names: string[]): ReportTable[] {
  return tables.filter((t) => names.includes(t.name));
}

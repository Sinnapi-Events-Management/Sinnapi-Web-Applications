import type { BreakdownSlice, TrendPoint } from '@sinnapi/ui/analytics';

// The wire shape of `vendor_analytics_detail`, and the view model the panels
// render. Postgres numeric/bigint arrive as JSON numbers (jsonb_build_object
// casts them); `percentile_cont` returns null on an empty set, so every median
// below is genuinely nullable and the components must say so rather than
// printing a zero that reads as a measured result.

// ---------- Wire ----------

export type ServiceRowWire = { name: string; bookings: number; revenue: number };
export type PackageRowWire = {
  name: string;
  quotes: number;
  accepted: number;
  revenue: number;
};
export type NamedValueWire = { name: string; value: number };

export type LeadTimeWire = {
  /** Median days between a booking being taken and the event itself. */
  median_days: number | null;
  /** How many bookings the median was measured over. */
  sample: number;
  buckets: NamedValueWire[];
};

export type SpeedWire = {
  /** Median hours from a quote request arriving to the vendor sending it. */
  quote_median_hours: number | null;
  quotes_priced: number;
  /** Median hours from a review being published to the vendor answering it. */
  reply_median_hours: number | null;
  replies: number;
  published: number;
  /** Lifetime answered ÷ published, or null when there are no reviews at all. */
  reply_rate: number | null;
};

export type ClientsWire = {
  total: number;
  repeat: number;
  repeat_rate: number | null;
  new_clients: number;
  top: Array<{ name: string; bookings: number; value: number }>;
};

export type SeasonalityRowWire = {
  bucket_start: string;
  bookings: number;
  revenue: number;
};

/** The whole RPC payload. */
export type VendorAnalyticsRow = {
  generated_at: string;
  period_days: number;
  services: ServiceRowWire[];
  packages: PackageRowWire[];
  event_types: NamedValueWire[];
  lead_time: LeadTimeWire;
  speed: SpeedWire;
  clients: ClientsWire;
  seasonality: SeasonalityRowWire[];
};

// ---------- View model ----------

/**
 * One row of a "top N" list, finished for display.
 *
 * Services, packages, clients and event types are four different questions with
 * one shape — a name, a headline figure, a supporting fact and a share of the
 * list's total — so they render through a single card rather than four.
 * `share` drives the inline bar: a ranked list without one makes the reader do
 * the division themselves.
 */
export type RankedItem = {
  key: string;
  name: string;
  /** Headline figure, already formatted for the reader's locale. */
  value: string;
  /** The supporting fact, e.g. "12 bookings · 38% won". */
  meta: string;
  /** Share of the list total, 0–1. */
  share: number;
};

export type LeadTimeModel = {
  medianDays: number | null;
  sample: number;
  /** Distribution as chart points — one bar per band, in reading order. */
  buckets: TrendPoint[];
  /** The median stated the way a vendor would say it, e.g. "6 weeks ahead". */
  headline: string;
};

export type SpeedModel = {
  quoteMedianHours: number | null;
  /** The quote median as a short duration, e.g. "4h" or "1d 6h". */
  quoteLabel: string;
  quotesPriced: number;
  replyMedianHours: number | null;
  replyLabel: string;
  replies: number;
  published: number;
  replyRate: number | null;
};

export type ClientsModel = {
  total: number;
  repeat: number;
  repeatRate: number | null;
  newClients: number;
  top: RankedItem[];
};

/** Everything the detail RPC contributes, in the shape the panels render it. */
export type AnalyticsModel = {
  generatedAt: string;
  services: RankedItem[];
  packages: RankedItem[];
  eventTypes: BreakdownSlice[];
  leadTime: LeadTimeModel;
  speed: SpeedModel;
  clients: ClientsModel;
  /** Twelve months of bookings by event date — always 12m, never the window. */
  seasonality: TrendPoint[];
};

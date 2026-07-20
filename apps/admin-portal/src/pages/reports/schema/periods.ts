// The reporting window. Every time-series report reads the active period so the
// toolbar's selector drives all charts at once (single source of truth).
export type ReportPeriod = '7d' | '30d' | '90d' | '12m';

export type PeriodOption = {
  value: ReportPeriod;
  /** Short label for the toolbar toggle. */
  label: string;
  /** Longer label used in exports / captions ("Last 30 days"). */
  longLabel: string;
  /** How many buckets a trend renders — daily for short spans, monthly for 12m. */
  buckets: number;
  /** Bucket granularity, which also sets the x-axis tick format. */
  unit: 'day' | 'week' | 'month';
  /** Rough span in days — used to derive the start date and scale mock volumes. */
  days: number;
};

// 90d collapses to 13 weekly buckets and 12m to 12 monthly ones so the x-axis
// stays legible instead of cramming 90/365 daily ticks.
export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7d', label: '7D', longLabel: 'Last 7 days', buckets: 7, unit: 'day', days: 7 },
  { value: '30d', label: '30D', longLabel: 'Last 30 days', buckets: 30, unit: 'day', days: 30 },
  { value: '90d', label: '90D', longLabel: 'Last 90 days', buckets: 13, unit: 'week', days: 90 },
  {
    value: '12m',
    label: '12M',
    longLabel: 'Last 12 months',
    buckets: 12,
    unit: 'month',
    days: 365,
  },
];

export const DEFAULT_PERIOD: ReportPeriod = '30d';

export function getPeriodOption(period: ReportPeriod): PeriodOption {
  return PERIOD_OPTIONS.find((p) => p.value === period) ?? PERIOD_OPTIONS[1];
}

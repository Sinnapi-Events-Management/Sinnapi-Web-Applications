// Shared shapes for every analytics surface in the admin portal — the Reports
// panels and the Dashboard both speak these, so a metric tile or chart written
// once renders identically wherever it is mounted.

/** How a metric value should be rendered and exported. */
export type ValueFormat = 'money' | 'number' | 'percent';

/** A single headline metric with an optional period-over-period delta. */
export type Kpi = {
  key: string;
  label: string;
  value: number;
  format: ValueFormat;
  /** Fractional change vs the previous comparable period (0.12 = +12%). */
  delta: number | null;
  /** When true, a downward delta is the *good* outcome (e.g. churn, refunds). */
  invertDelta?: boolean;
};

/**
 * One point on a trend chart. `bucket` is the x-axis label; the remaining keys
 * are numeric series (a chart declares which keys it draws), so a single row can
 * back a multi-series line/area/bar. Values are read via `Number(point[key])`.
 */
export type TrendPoint = { bucket: string; [series: string]: number | string };

/** A named series drawn from a `TrendPoint[]` — `key` indexes into each point. */
export type SeriesDef = {
  key: string;
  label: string;
  /** Semantic palette slot; resolved to a hex at render via the theme. */
  color: SeriesColor;
  format?: ValueFormat;
};

export type SeriesColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/** A slice of a categorical breakdown (donut / distribution chart). */
export type BreakdownSlice = { name: string; value: number; color: SeriesColor };

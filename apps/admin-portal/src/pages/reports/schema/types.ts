// Report-only shapes. The generic metric/chart vocabulary (Kpi, TrendPoint,
// SeriesDef, BreakdownSlice, ValueFormat) lives in `@/lib/analytics` so the
// Dashboard shares it — re-exported here so report modules keep one import.
export type {
  BreakdownSlice,
  Kpi,
  SeriesColor,
  SeriesDef,
  TrendPoint,
  ValueFormat,
} from '@/lib/analytics';

/**
 * A flat, export-ready table. Each report dataset produces one of these; the
 * Excel exporter turns it into a worksheet and the PDF exporter into a section,
 * so exports stay in lock-step with what the charts show.
 */
export type ReportTable = {
  /** Worksheet / section name (≤ 31 chars for Excel). */
  name: string;
  columns: string[];
  rows: (string | number)[][];
};

/** Common envelope every report hook resolves to. */
export type ReportState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  /** Export-ready tables for this report, empty while loading. */
  tables: ReportTable[];
};

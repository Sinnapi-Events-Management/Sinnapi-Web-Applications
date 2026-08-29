// Report-only shapes. The generic metric/chart vocabulary (Kpi, TrendPoint,
// SeriesDef, BreakdownSlice, ValueFormat) lives in `@sinnapi/ui/analytics` so the
// Dashboard shares it — re-exported here so report modules keep one import.
export type {
  BreakdownSlice,
  Kpi,
  SeriesColor,
  SeriesDef,
  TrendPoint,
  ValueFormat,
} from '@sinnapi/ui/analytics';

// The export table shape is shared with the vendor portal (`@sinnapi/ui/export`)
// so both consoles serialise the same way — an admin and a vendor comparing the
// same figures should be reading documents with the same columns.
import type { ReportTable } from '@sinnapi/ui/export';

export type { ReportTable };

/** Common envelope every report hook resolves to. */
export type ReportState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  /** Export-ready tables for this report, empty while loading. */
  tables: ReportTable[];
};

// The reporting window is the shared analytics window — re-exported under the
// report-local `ReportPeriod` name that every panel, toolbar and export already
// speaks, so the two vocabularies stay a single type.
export {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  getPeriodOption,
  type PeriodOption,
} from '@/lib/analytics';
export type { AnalyticsPeriod as ReportPeriod } from '@/lib/analytics';

import type { AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { ExportMenu, type ExportFormat, type ReportTable } from '@sinnapi/ui/export';
import { MetricsToolbar } from '@/components/metrics';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (next: AnalyticsPeriod) => void;
  generatedAt?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Every table on the page — the whole-report export. */
  tables: ReportTable[];
  onExport: (tables: ReportTable[], format: ExportFormat) => void;
};

/**
 * The page's control bar: the shared `MetricsToolbar` the dashboard also uses,
 * with the one control only this page has.
 *
 * Exports the *whole page*, not the open tab. A vendor sending figures onward
 * wants the file to be their analytics, and having to visit four tabs and
 * download four files to assemble that would be a worse answer than the button
 * they expected. Per-card menus stay for the narrower case.
 */
export default function AnalyticsToolbar({
  period,
  onPeriodChange,
  generatedAt,
  isRefreshing,
  onRefresh,
  tables,
  onExport,
}: Props) {
  return (
    <MetricsToolbar
      period={period}
      onPeriodChange={onPeriodChange}
      generatedAt={generatedAt}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      surfaceLabel="Analytics"
      action={
        <ExportMenu
          label="Export"
          onExport={(format) => onExport(tables, format)}
          // Disabled until both reads have resolved: a half-populated export is
          // worse than none, because the gap is invisible once the file has
          // left the browser.
          disabled={!tables.length}
        />
      }
    />
  );
}

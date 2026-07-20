import { Alert } from '@sinnapi/ui';
import type { ReportPeriod, ReportTable } from '../../schema';
import type { ExportFormat } from '../../data/reportExport';
import { useReportExport } from '../../hooks/useReportExport';
import ReportToolbar from './ReportToolbar';

type Props = {
  title: string;
  description: string;
  period: ReportPeriod;
  onPeriodChange: (next: ReportPeriod) => void;
  /** Every table in the report — powers the whole-report export. */
  tables: ReportTable[];
  error: unknown;
  /**
   * Panel body. Receives a bound exporter so per-card menus serialise their own
   * subset of tables with the same filename/period metadata as the toolbar.
   */
  children: (
    exportTables: (tables: ReportTable[], format: ExportFormat) => void,
  ) => React.ReactNode;
};

/**
 * Common frame for a report panel: the sticky toolbar (period + export-all) plus
 * error handling. Keeps every panel focused on just its KPIs and charts.
 */
export default function ReportShell({
  title,
  description,
  period,
  onPeriodChange,
  tables,
  error,
  children,
}: Props) {
  const exportTables = useReportExport(title, period);

  return (
    <>
      <ReportToolbar
        description={description}
        period={period}
        onPeriodChange={onPeriodChange}
        onExportAll={(format) => exportTables(tables, format)}
        exportDisabled={!tables.length}
      />
      {error ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Could not load this report.'}
        </Alert>
      ) : (
        children(exportTables)
      )}
    </>
  );
}

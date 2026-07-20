import { useCallback } from 'react';
import { getPeriodOption, type ReportPeriod, type ReportTable } from '../schema';
import { exportReport, type ExportFormat } from '../data/reportExport';

/**
 * Binds a report's title + active period into a single export callback, so both
 * the per-card menus and the whole-report menu serialise with consistent
 * metadata (filename, PDF header). The caller passes the tables to export.
 */
export function useReportExport(title: string, period: ReportPeriod) {
  return useCallback(
    (tables: ReportTable[], format: ExportFormat) =>
      exportReport(format, tables, { title, period: getPeriodOption(period).longLabel }),
    [title, period],
  );
}

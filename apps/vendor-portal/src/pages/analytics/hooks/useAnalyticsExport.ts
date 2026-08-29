import { useCallback } from 'react';
import { getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { exportTables, type ExportFormat, type ReportTable } from '@sinnapi/ui/export';

/**
 * Binds the reporting window and the vendor's own name into a single export
 * callback, so a per-card download and a whole-page one carry identical
 * metadata — same filename stem, same PDF header, same period.
 *
 * The business name is on the document because a vendor's export usually
 * leaves the platform: it goes to an accountant, a bank or a partner, and a
 * page of figures with nobody's name on it is not evidence of anything.
 */
export function useAnalyticsExport(period: AnalyticsPeriod, businessName?: string) {
  return useCallback(
    (tables: ReportTable[], format: ExportFormat) => {
      // Fire-and-forget: `exportTables` is async only because it code-splits
      // the serialisers, and the caller is a menu item with nothing to await.
      void exportTables(format, tables, {
        title: 'Vendor analytics',
        period: getPeriodOption(period).longLabel,
        subject: businessName,
      });
    },
    [period, businessName],
  );
}

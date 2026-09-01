import type { ExportFormat, ExportMeta, ReportTable } from './types';

/**
 * Serialise a set of tables and hand the browser the download.
 *
 * Async because the serialisers are code-split: `xlsx` and `jspdf` together
 * weigh about half a megabyte, and putting them in the main bundle would make
 * every portal visitor pay for a feature used occasionally — and, on a plan
 * without the analytics entitlement, never. The chunk is fetched on the first
 * export click.
 *
 * Call sites treat this as fire-and-forget (`void exportTables(...)`); a
 * failure to load the chunk surfaces as an unhandled rejection rather than a
 * silently dead button.
 */
export async function exportTables(
  format: ExportFormat,
  tables: ReportTable[],
  meta: ExportMeta,
): Promise<void> {
  const { exportTablesExcel, exportTablesPdf } = await import('./serializers');
  if (format === 'excel') exportTablesExcel(tables, meta);
  else exportTablesPdf(tables, meta);
}

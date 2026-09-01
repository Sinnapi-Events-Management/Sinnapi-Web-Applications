// The vocabulary of a tabular export, shared by every portal.
//
// A chart is not exportable; the table behind it is. So each surface that
// offers an export publishes its data as `ReportTable[]` — one flat table per
// dataset — and the exporters below turn that into a worksheet or a PDF
// section. Charts and exports therefore always describe the same rows.

/** A flat, export-ready table: one worksheet, or one PDF section. */
export type ReportTable = {
  /** Worksheet / section name. Excel truncates past 31 chars; the exporter handles it. */
  name: string;
  columns: string[];
  rows: (string | number)[][];
};

export type ExportFormat = 'excel' | 'pdf';

export type ExportMeta = {
  /** Report title — heads the PDF and seeds the filename, e.g. "Vendor analytics". */
  title: string;
  /** The active reporting window's long label, e.g. "Last 30 days". */
  period: string;
  /**
   * Optional subject line under the title, e.g. the vendor's business name.
   * A vendor sending an export to their accountant needs the document to say
   * whose books it is; a system-wide admin report does not.
   */
  subject?: string;
  /** PDF table-header fill as RGB. Defaults to the brand teal. */
  headFill?: [number, number, number];
};

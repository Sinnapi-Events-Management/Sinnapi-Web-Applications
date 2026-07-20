import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateTime } from '@/lib/config';
import type { ReportTable } from '../schema';

export type ExportMeta = {
  /** Report/category title, e.g. "Revenue & payments". */
  title: string;
  /** The active period's long label, e.g. "Last 30 days". */
  period: string;
};

// Excel caps worksheet names at 31 chars and forbids a handful of characters;
// this also de-duplicates so two tables never collide on the same tab name.
function safeSheetName(name: string, used: Set<string>): string {
  const base =
    name
      .replace(/[\\/?*[\]:]/g, ' ')
      .slice(0, 31)
      .trim() || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${i++}`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function fileStem(meta: ExportMeta): string {
  return `sinnapi-${meta.title}-${meta.period}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** One workbook, one worksheet per report table. Triggers a browser download. */
export function exportReportExcel(tables: ReportTable[], meta: ExportMeta): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const table of tables) {
    const ws = XLSX.utils.aoa_to_sheet([table.columns, ...table.rows]);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(table.name, used));
  }
  XLSX.writeFile(wb, `${fileStem(meta)}.xlsx`);
}

/** A single PDF: title block + one auto-table section per report table. */
export function exportReportPdf(tables: ReportTable[], meta: ExportMeta): void {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;

  pdf.setFontSize(18);
  pdf.text(meta.title, marginX, 50);

  pdf.setFontSize(10);
  pdf.setTextColor(110);
  pdf.text(
    [`Period: ${meta.period}`, `Generated: ${formatDateTime(new Date().toISOString())}`],
    marginX,
    72,
  );

  let startY = 100;
  for (const table of tables) {
    pdf.setFontSize(12);
    pdf.setTextColor(30);
    pdf.text(table.name, marginX, startY);

    autoTable(pdf, {
      startY: startY + 8,
      margin: { left: marginX, right: marginX },
      head: [table.columns],
      body: table.rows.map((r) => r.map((c) => String(c))),
      headStyles: { fillColor: [7, 80, 77] }, // brand primary (teal)
      styles: { fontSize: 9, cellPadding: 5 },
    });

    const endY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    startY = (endY ?? startY) + 28;
  }

  pdf.save(`${fileStem(meta)}.pdf`);
}

export type ExportFormat = 'excel' | 'pdf';

export function exportReport(format: ExportFormat, tables: ReportTable[], meta: ExportMeta): void {
  if (format === 'excel') exportReportExcel(tables, meta);
  else exportReportPdf(tables, meta);
}

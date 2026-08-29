import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ExportMeta, ReportTable } from './types';

// The Excel and PDF serialisers for `ReportTable[]`.
//
// Promoted out of admin-portal so the vendor portal exports in exactly the same
// shape — a vendor and an admin discussing the same figures should be looking
// at documents with the same columns, not two hand-rolled formats.
//
// NOTHING IMPORTS THIS MODULE STATICALLY. `xlsx` and `jspdf` together are
// roughly half a megabyte, and an export is something a vendor does
// occasionally and many never do at all — so `exportTables.ts` reaches it
// through a dynamic import and the bundler splits it into a chunk that is
// fetched on the first click, not on first paint.

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

/** Generation stamp for the PDF header. Local to the reader's locale, like every other timestamp. */
function stamp(): string {
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** One workbook, one worksheet per table. Triggers a browser download. */
export function exportTablesExcel(tables: ReportTable[], meta: ExportMeta): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const table of tables) {
    const ws = XLSX.utils.aoa_to_sheet([table.columns, ...table.rows]);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(table.name, used));
  }
  XLSX.writeFile(wb, `${fileStem(meta)}.xlsx`);
}

/** A single PDF: title block + one auto-table section per table. */
export function exportTablesPdf(tables: ReportTable[], meta: ExportMeta): void {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;

  pdf.setFontSize(18);
  pdf.text(meta.title, marginX, 50);

  pdf.setFontSize(10);
  pdf.setTextColor(110);
  pdf.text(
    [meta.subject, `Period: ${meta.period}`, `Generated: ${stamp()}`].filter(Boolean) as string[],
    marginX,
    72,
  );

  // Each header line the subject added pushes the first table down with it.
  let startY = meta.subject ? 114 : 100;
  for (const table of tables) {
    pdf.setFontSize(12);
    pdf.setTextColor(30);
    pdf.text(table.name, marginX, startY);

    autoTable(pdf, {
      startY: startY + 8,
      margin: { left: marginX, right: marginX },
      head: [table.columns],
      body: table.rows.map((r) => r.map((c) => String(c))),
      headStyles: { fillColor: meta.headFill ?? [7, 80, 77] }, // brand primary (teal)
      styles: { fontSize: 9, cellPadding: 5 },
    });

    const endY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    startY = (endY ?? startY) + 28;
  }

  pdf.save(`${fileStem(meta)}.pdf`);
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { QuotationDocument } from '@/lib/types';

/**
 * Render a quotation (header + line items) to a PDF and trigger a download.
 * Quotations are structured data, not stored files, so the admin's "Download
 * quotation" builds the document client-side from `get_event_quotation`. Kept
 * framework-free (pure jsPDF) so it can run from any handler without React.
 */
export function downloadQuotationPdf(doc: QuotationDocument): void {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  const cur = doc.currency ?? 'UGX';

  pdf.setFontSize(18);
  pdf.text('Quotation', marginX, 50);

  pdf.setFontSize(10);
  pdf.setTextColor(110);
  const metaLines = [
    `Reference: ${doc.reference_no ?? '—'}`,
    `Status: ${titleize(doc.status)}`,
    `Vendor: ${doc.vendor_name ?? '—'}`,
    `Client: ${doc.client_name ?? '—'}`,
    doc.event_title ? `Event: ${doc.event_title}` : null,
    `Created: ${formatDate(doc.created_at)}`,
    doc.sent_at ? `Sent: ${formatDate(doc.sent_at)}` : null,
    doc.valid_until ? `Valid until: ${formatDate(doc.valid_until)}` : null,
  ].filter(Boolean) as string[];
  pdf.text(metaLines, marginX, 74);

  const bodyStartY = 74 + metaLines.length * 14 + 12;

  autoTable(pdf, {
    startY: bodyStartY,
    margin: { left: marginX, right: marginX },
    head: [['Description', 'Qty', 'Unit price', 'Line total']],
    body: doc.items.map((it) => [
      it.description,
      String(it.quantity ?? 1),
      formatMoney(it.unit_price, cur),
      formatMoney(it.line_total, cur),
    ]),
    headStyles: { fillColor: [33, 33, 33] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  // `lastAutoTable` is stamped on the doc by jspdf-autotable after render.
  const endY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  let y = (endY ?? bodyStartY) + 24;
  pdf.setFontSize(10);
  pdf.setTextColor(30);
  const totals: [string, number | null][] = [
    ['Subtotal', doc.subtotal],
    ['Discount', doc.discount_total],
    ['Tax', doc.tax_total],
    ['Total', doc.total],
  ];
  const labelX = 380;
  const valueX = 555;
  totals.forEach(([label, value], i) => {
    const isTotal = i === totals.length - 1;
    pdf.setFont('helvetica', isTotal ? 'bold' : 'normal');
    pdf.text(label, labelX, y);
    pdf.text(formatMoney(value, cur), valueX, y, { align: 'right' });
    y += 16;
  });

  pdf.save(`quotation-${doc.reference_no ?? doc.id}.pdf`);
}

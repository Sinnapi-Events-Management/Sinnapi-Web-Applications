import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentMoney,
  invoiceDisplayStatus,
  kampalaToday,
  partyLines,
  type InvoiceView,
} from '@sinnapi/ui/documents/core';
import { CONTENT_BOTTOM, CONTENT_WIDTH, INK, PAGE, SIZE, TOP } from './theme';
import { pdfText } from './text';
import { ensureSpace, label, paragraph, paragraphHeight, textRight } from './draw';
import { drawHeader, type Stamp } from './sections/header';
import { drawPageFurniture } from './sections/footer';
import type { PdfLogo } from './logo';

const ESCROW_PAY_NOTE =
  'This booking is paid securely through Sinnapi. Open the booking in your Sinnapi account to pay.';

function stampFor(invoice: InvoiceView, today: string): Stamp {
  const display = invoiceDisplayStatus(invoice.status, invoice.dueDate, today);
  switch (display) {
    case 'paid':
      return { label: 'PAID', fill: INK.successTint, ink: INK.successInk };
    case 'partially_paid':
      return { label: 'PARTLY PAID', fill: INK.warningTint, ink: INK.warningInk };
    case 'overdue':
      return { label: 'OVERDUE', fill: INK.warningTint, ink: INK.warningInk };
    case 'void':
      return { label: 'VOID', fill: INK.voidTint, ink: INK.voidInk };
    case 'draft':
      return { label: 'DRAFT', fill: INK.neutralTint, ink: INK.muted };
    default:
      return null;
  }
}

/** Issued · Due · Currency · Balance due, the last cell highlighted. */
function drawMetaStrip(pdf: jsPDF, invoice: InvoiceView, y: number): number {
  const h = 42;
  const cell = CONTENT_WIDTH / 4;
  const x0 = PAGE.margin;
  const cells: [string, string][] = [
    ['Issued', formatDocumentDate(invoice.issueDate)],
    ['Due', formatDocumentDate(invoice.dueDate)],
    ['Currency', invoice.currency],
    ['Balance due', formatDocumentMoney(invoice.balanceDue, invoice.currency)],
  ];

  // The last cell's fill follows the strip's rounded right corners, and is
  // squared off on its left where it meets the divider.
  pdf.setFillColor(...INK.band);
  pdf.roundedRect(x0 + cell * 3, y, cell, h, 6, 6, 'F');
  pdf.rect(x0 + cell * 3, y, 8, h, 'F');
  pdf.setDrawColor(...INK.rule);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(x0, y, CONTENT_WIDTH, h, 6, 6, 'S');
  for (let i = 1; i < 4; i += 1) pdf.line(x0 + cell * i, y, x0 + cell * i, y + h);

  cells.forEach(([name, value], i) => {
    const x = x0 + cell * i + 11;
    label(pdf, name, x, y + 15);
    pdf.setFont('helvetica', i === 3 ? 'bold' : 'normal');
    pdf.setFontSize(i === 3 ? 10.5 : 10);
    pdf.setTextColor(...INK.ink);
    pdf.text(pdfText(value), x, y + 31);
  });
  return y + h + 22;
}

/** Bill to (left) and the "For" line (right). */
function drawParties(pdf: jsPDF, invoice: InvoiceView, y: number): number {
  const colW = (CONTENT_WIDTH - 24) / 2;
  const left = PAGE.margin;
  const rightCol = left + colW + 24;

  label(pdf, 'Bill to', left, y);
  let ly = paragraph(pdf, invoice.recipient.name || '-', left, y + 15, colW, {
    size: 11,
    bold: true,
  });
  for (const line of partyLines(invoice.recipient)) {
    ly = paragraph(pdf, line, left, ly, colW, { size: SIZE.small, color: INK.muted });
  }

  let ry = y;
  if (invoice.title) {
    label(pdf, 'For', rightCol, y);
    ry = paragraph(pdf, invoice.title, rightCol, y + 15, colW, { size: 10 });
  }
  return Math.max(ly, ry) + 12;
}

function drawItems(pdf: jsPDF, invoice: InvoiceView, y: number): number {
  const cur = invoice.currency;
  const body = invoice.items.length
    ? invoice.items.map((item) => [
        pdfText(item.description),
        item.quantity.toLocaleString('en-UG', { maximumFractionDigits: 2 }),
        formatDocumentAmount(item.unitPrice, cur),
        formatDocumentAmount(item.lineTotal, cur),
      ])
    : [['No items.', '', '', '']];

  autoTable(pdf, {
    startY: y,
    margin: {
      left: PAGE.margin,
      right: PAGE.margin,
      top: TOP,
      bottom: PAGE.height - CONTENT_BOTTOM,
    },
    head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    // A row moves whole to the next page rather than splitting, so a wrapped
    // description never strands its second line under a repeated header.
    rowPageBreak: 'avoid',
    headStyles: {
      textColor: INK.muted,
      fontStyle: 'bold',
      fontSize: SIZE.label,
      cellPadding: { top: 0, bottom: 7, left: 0, right: 0 },
      lineColor: INK.ink,
      lineWidth: { bottom: 1.1 },
    },
    bodyStyles: {
      textColor: INK.ink,
      fontSize: SIZE.body,
      cellPadding: { top: 8, bottom: 8, left: 0, right: 0 },
      lineColor: INK.hairline,
      lineWidth: { bottom: 0.6 },
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 'auto', cellPadding: { top: 8, bottom: 8, left: 0, right: 10 } },
      1: { halign: 'right', cellWidth: 46 },
      2: { halign: 'right', cellWidth: 92 },
      3: { halign: 'right', cellWidth: 100 },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'right';
    },
  });

  const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return (finalY ?? y) + 20;
}

type Row = { label: string; value: string; strong?: boolean };

function summaryRows(invoice: InvoiceView): Row[] {
  const cur = invoice.currency;
  const rows: Row[] = [{ label: 'Subtotal', value: formatDocumentAmount(invoice.subtotal, cur) }];
  if (invoice.discountLabel) {
    rows.push({
      label: invoice.discountLabel,
      value: `-${formatDocumentAmount(invoice.discountTotal, cur)}`,
    });
  }
  invoice.charges.forEach((c) =>
    rows.push({ label: c.description, value: formatDocumentAmount(c.lineTotal, cur) }),
  );
  if (invoice.taxLabel)
    rows.push({ label: invoice.taxLabel, value: formatDocumentAmount(invoice.taxTotal, cur) });
  rows.push({ label: 'Total', value: formatDocumentMoney(invoice.total, cur), strong: true });
  if (invoice.amountPaid > 0) {
    rows.push({
      label: 'Paid to date',
      value: `-${formatDocumentAmount(invoice.amountPaid, cur)}`,
    });
  }
  return rows;
}

const SUMMARY_W = 222;
const ROW_H = 16;
const BAND_H = 32;

/**
 * The money summary (right) and how-to-pay / notes (left). The summary is
 * kept whole — a total stranded from its lines is the confusion an invoice
 * exists to prevent — so if it will not fit, it starts a new page. Long
 * notes then flow line by line onto further pages if they must.
 */
function drawTail(pdf: jsPDF, invoice: InvoiceView, y: number): void {
  const rows = summaryRows(invoice);
  const summaryH = rows.length * ROW_H + 10 + BAND_H;
  let top = ensureSpace(pdf, y, summaryH);

  const sx = PAGE.margin + CONTENT_WIDTH - SUMMARY_W;
  const right = PAGE.margin + CONTENT_WIDTH;
  let sy = top;
  for (const row of rows) {
    if (row.strong) {
      pdf.setDrawColor(...INK.ink);
      pdf.setLineWidth(1.1);
      pdf.line(sx, sy + 2, right, sy + 2);
      sy += 4;
    }
    pdf.setFont('helvetica', row.strong ? 'bold' : 'normal');
    pdf.setFontSize(SIZE.body);
    pdf.setTextColor(...(row.strong ? INK.ink : INK.muted));
    const labelLines = pdf.splitTextToSize(pdfText(row.label), SUMMARY_W - 110) as string[];
    pdf.text(labelLines[0], sx, sy + 11);
    pdf.setTextColor(...INK.ink);
    textRight(pdf, row.value, right, sy + 11);
    sy += ROW_H;
  }
  sy += 6;
  pdf.setFillColor(...INK.band);
  pdf.roundedRect(sx, sy, SUMMARY_W, BAND_H, 6, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(SIZE.label);
  pdf.setTextColor(...INK.ink);
  pdf.text('BALANCE DUE', sx + 12, sy + BAND_H / 2, { baseline: 'middle', charSpace: 0.6 });
  pdf.setFontSize(13);
  pdf.text(
    pdfText(formatDocumentMoney(invoice.balanceDue, invoice.currency)),
    right - 12,
    sy + BAND_H / 2,
    {
      align: 'right',
      baseline: 'middle',
    },
  );

  // ---------- left column: how to pay, notes ----------
  const leftW = CONTENT_WIDTH - SUMMARY_W - 30;
  const blocks: [string, string][] = [];
  const pay =
    invoice.paymentChannel === 'sinnapi_escrow' ? ESCROW_PAY_NOTE : invoice.paymentInstructions;
  if (pay) blocks.push(['How to pay', pay]);
  const notes = [invoice.notes, invoice.terms].filter(Boolean).join('\n\n');
  if (notes) blocks.push(['Notes & terms', notes]);
  if (invoice.status === 'void' && invoice.voidReason) blocks.push(['Voided', invoice.voidReason]);

  let ly = top + 2;
  for (const [name, text] of blocks) {
    // Keep a label with at least its first two lines.
    ly = ensureSpace(pdf, ly, 14 + Math.min(paragraphHeight(pdf, text, leftW), 28));
    if (ly === TOP) top = TOP;
    label(pdf, name, PAGE.margin, ly);
    ly =
      paragraph(pdf, text, PAGE.margin, ly + 14, leftW, {
        size: SIZE.small + 0.5,
        color: INK.body,
      }) + 10;
  }
}

/** Render an invoice to a jsPDF document (A4, points). */
export function buildInvoicePdf(
  invoice: InvoiceView,
  opts: { logo?: PdfLogo | null; today?: string; compress?: boolean } = {},
): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: opts.compress ?? true });
  const documentNo = invoice.documentNo ?? 'DRAFT';

  let y = drawHeader(pdf, {
    vendor: invoice.vendor,
    logo: opts.logo ?? null,
    title: 'INVOICE',
    documentNo,
    stamp: stampFor(invoice, opts.today ?? kampalaToday()),
  });
  y = drawMetaStrip(pdf, invoice, y);
  y = drawParties(pdf, invoice, y);
  y = drawItems(pdf, invoice, ensureSpace(pdf, y, 60));
  drawTail(pdf, invoice, y);

  drawPageFurniture(pdf, documentNo, invoice.status === 'void');
  return pdf;
}

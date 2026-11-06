import { jsPDF } from 'jspdf';
import {
  RECEIPT_METHOD_LABELS,
  amountInWords,
  balanceLine,
  formatDocumentDate,
  formatDocumentMoney,
  partyLines,
  type ReceiptView,
} from '@sinnapi/ui/documents/core';
import { CONTENT_WIDTH, INK, PAGE, SIZE } from './theme';
import { pdfText } from './text';
import { ensureSpace, label, paragraph, pill, textRight } from './draw';
import { drawHeader } from './sections/header';
import { drawPageFurniture } from './sections/footer';
import type { PdfLogo } from './logo';

/** The band with the amount received — the largest thing on the page. */
function drawHero(pdf: jsPDF, receipt: ReceiptView, y: number): number {
  const h = 86;
  const x = PAGE.margin;
  const right = x + CONTENT_WIDTH;
  pdf.setFillColor(...INK.band);
  pdf.roundedRect(x, y, CONTENT_WIDTH, h, 10, 10, 'F');

  label(pdf, 'Amount received', x + 20, y + 22);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(27);
  pdf.setTextColor(...INK.ink);
  pdf.text(pdfText(formatDocumentMoney(receipt.amount, receipt.currency)), x + 20, y + 52);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(SIZE.small + 0.5);
  pdf.setTextColor(...INK.body);
  const words = pdf.splitTextToSize(
    pdfText(amountInWords(receipt.amount, receipt.currency)),
    CONTENT_WIDTH - 140,
  ) as string[];
  pdf.text(words[0], x + 20, y + 70);

  if (receipt.status !== 'void') {
    pill(pdf, 'RECEIVED', right - 20, y + h / 2 - 8, INK.white, INK.successInk);
  }
  return y + h + 24;
}

/** Received from · Payment date · Method · Reference · For, two to a row. */
function drawFacts(pdf: jsPDF, receipt: ReceiptView, y: number): number {
  const colW = (CONTENT_WIDTH - 28) / 2;
  const cols = [PAGE.margin, PAGE.margin + colW + 28];
  const facts: {
    name: string;
    value: string;
    lines?: string[];
    strong?: boolean;
    full?: boolean;
  }[] = [
    {
      name: 'Received from',
      value: receipt.recipient.name,
      lines: partyLines(receipt.recipient),
      strong: true,
    },
    { name: 'Payment date', value: formatDocumentDate(receipt.paymentDate) },
    { name: 'Payment method', value: RECEIPT_METHOD_LABELS[receipt.paymentMethod] },
  ];
  if (receipt.paymentReference)
    facts.push({ name: 'Transaction reference', value: receipt.paymentReference });
  facts.push({ name: 'For', value: receipt.description, full: true });

  let rowY = y;
  let col = 0;
  let rowBottom = y;
  for (const f of facts) {
    if (f.full && col === 1) {
      rowY = rowBottom;
      col = 0;
    }
    const width = f.full ? CONTENT_WIDTH : colW;
    const x = cols[col];
    rowY = ensureSpace(pdf, rowY, 40);
    label(pdf, f.name, x, rowY);
    let fy = paragraph(pdf, f.value, x, rowY + 15, width, {
      size: f.strong ? 11 : 10,
      bold: f.strong,
    });
    for (const line of f.lines ?? [])
      fy = paragraph(pdf, line, x, fy, width, { size: SIZE.small, color: INK.muted });
    rowBottom = Math.max(rowBottom, fy + 10);
    if (f.full || col === 1) {
      rowY = rowBottom;
      col = 0;
    } else {
      col = 1;
    }
  }
  return rowBottom + 6;
}

/** Invoice total → paid before → this payment → outstanding; or just the outstanding figure. */
function drawBalance(pdf: jsPDF, receipt: ReceiptView, y: number): number {
  const cur = receipt.currency;
  const rows: { name: string; value: string; strong?: boolean }[] = [];
  if (receipt.invoice) {
    const paidBefore = Math.max(receipt.invoice.total - receipt.invoice.balanceBefore, 0);
    rows.push(
      {
        name: `Invoice total${receipt.invoice.documentNo ? ` (${receipt.invoice.documentNo})` : ''}`,
        value: formatDocumentMoney(receipt.invoice.total, cur),
      },
      { name: 'Paid before this receipt', value: formatDocumentMoney(paidBefore, cur) },
      { name: 'This payment', value: formatDocumentMoney(receipt.amount, cur) },
    );
  }
  if (receipt.balanceAfter !== null) {
    const after = balanceLine(receipt.balanceAfter, cur, 'Outstanding balance');
    rows.push({ name: after.label, value: after.value, strong: true });
  }
  if (!rows.length) return y;

  const rowH = 22;
  const boxH = rows.length * rowH + 8;
  y = ensureSpace(pdf, y, boxH + 18);
  label(pdf, receipt.invoice ? 'Invoice balance' : 'Balance', PAGE.margin, y);
  const top = y + 8;
  pdf.setDrawColor(...INK.rule);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(PAGE.margin, top, CONTENT_WIDTH, boxH, 6, 6, 'S');

  rows.forEach((r, i) => {
    const ry = top + 4 + i * rowH;
    if (i > 0) {
      pdf.setDrawColor(...INK.hairline);
      pdf.line(PAGE.margin + 14, ry, PAGE.margin + CONTENT_WIDTH - 14, ry);
    }
    pdf.setFont('helvetica', r.strong ? 'bold' : 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...(r.strong ? INK.ink : INK.muted));
    pdf.text(pdfText(r.name), PAGE.margin + 14, ry + 14);
    pdf.setTextColor(...INK.ink);
    textRight(pdf, r.value, PAGE.margin + CONTENT_WIDTH - 14, ry + 14);
  });
  return top + boxH + 22;
}

/** Render a payment receipt to a jsPDF document (A4, points). */
export function buildReceiptPdf(receipt: ReceiptView, opts: { logo?: PdfLogo | null } = {}): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const isVoid = receipt.status === 'void';

  let y = drawHeader(pdf, {
    vendor: receipt.vendor,
    logo: opts.logo ?? null,
    title: 'PAYMENT RECEIPT',
    documentNo: receipt.documentNo,
    stamp: isVoid ? { label: 'VOID', fill: INK.voidTint, ink: INK.voidInk } : null,
  });
  y = drawHero(pdf, receipt, y);
  y = drawFacts(pdf, receipt, y);
  y = drawBalance(pdf, receipt, y);

  if (receipt.notes) {
    y = ensureSpace(pdf, y, 40);
    label(pdf, 'Notes', PAGE.margin, y);
    y =
      paragraph(pdf, receipt.notes, PAGE.margin, y + 14, CONTENT_WIDTH, {
        size: SIZE.small + 0.5,
        color: INK.body,
      }) + 10;
  }
  if (isVoid && receipt.voidReason) {
    y = ensureSpace(pdf, y, 40);
    label(pdf, 'Voided', PAGE.margin, y);
    y = paragraph(pdf, receipt.voidReason, PAGE.margin, y + 14, CONTENT_WIDTH, { size: 10 }) + 10;
  }

  y = ensureSpace(pdf, y + 6, 20);
  paragraph(
    pdf,
    `Received and confirmed by ${receipt.vendor.business_name} on ${formatDocumentDate(receipt.confirmedAt)}.`,
    PAGE.margin,
    y,
    CONTENT_WIDTH,
    { size: SIZE.small, color: INK.muted },
  );

  drawPageFurniture(pdf, receipt.documentNo, isVoid);
  return pdf;
}

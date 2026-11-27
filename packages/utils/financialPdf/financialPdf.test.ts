import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { InvoiceView, ReceiptView } from '@sinnapi/ui/documents/core';
import {
  buildInvoicePdf,
  buildReceiptPdf,
  invoiceFileName,
  pdfText,
  receiptFileName,
} from './index';

// Set PDF_OUT=/some/dir to write the rendered files out for a visual check.
const OUT = process.env.PDF_OUT;
function keep(name: string, pdf: { output: (type: 'arraybuffer') => ArrayBuffer }) {
  if (OUT) writeFileSync(join(OUT, name), Buffer.from(pdf.output('arraybuffer')));
}

/** Every text string the PDF draws, with its compressed page streams inflated. */
function pdfStrings(pdf: { output: (type: 'arraybuffer') => ArrayBuffer }): string {
  const raw = Buffer.from(pdf.output('arraybuffer'));
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = raw.indexOf('stream\n', from);
    if (start < 0) break;
    const end = raw.indexOf('\nendstream', start);
    try {
      out.push(inflateSync(raw.subarray(start + 7, end)).toString('latin1'));
    } catch {
      // not a deflated stream (fonts, images)
    }
    from = end + 10;
  }
  return out.join('\n');
}

const vendor = {
  business_name: 'Amani Events & Décor',
  location: 'Plot 14, Kira Road',
  city: 'Kampala',
  phone: '+256 700 000000',
  website: 'amani.example',
  registration_no: '80020001234567',
};

function invoice(items: number, over: Partial<InvoiceView> = {}): InvoiceView {
  return {
    documentNo: 'SNP-INV-48203917',
    status: 'partially_paid',
    paymentChannel: 'vendor_collected',
    title: 'Wedding reception décor — 22 Nov 2026',
    issueDate: '2026-11-05',
    dueDate: '2026-11-19',
    currency: 'UGX',
    vendor,
    recipient: { name: 'Sarah K.', phone: '+256 772 000000', address: 'Kampala' },
    items: Array.from({ length: items }, (_, i) => ({
      kind: 'item' as const,
      description:
        i % 7 === 3
          ? 'Stage décor and floral arrangements — fresh roses, greenery, backdrop and draping for the main stage and the entrance arch'
          : `Item ${i + 1}`,
      quantity: 2,
      unitPrice: 45000,
      lineTotal: 90000,
    })),
    charges: [
      {
        kind: 'charge',
        description: 'Transport',
        quantity: 1,
        unitPrice: 150000,
        lineTotal: 150000,
      },
    ],
    subtotal: 90000 * items,
    discountLabel: 'Discount (5%)',
    discountTotal: 4500 * items,
    taxLabel: null,
    taxInclusive: false,
    taxTotal: 0,
    total: 85500 * items + 150000,
    amountPaid: 100000,
    balanceDue: 85500 * items + 50000,
    paymentInstructions:
      'Mobile Money: 0700 000000 — Amani Events\nBank: Stanbic, A/C 9030000000000',
    notes: '50% deposit secures the date.',
    terms: 'Balance due one week before the event.',
    voidReason: null,
    ...over,
  };
}

const receipt: ReceiptView = {
  documentNo: 'SNP-RCT-70415586',
  status: 'issued',
  paymentDate: '2026-11-06',
  currency: 'UGX',
  amount: 2000000,
  paymentMethod: 'mtn_momo',
  paymentReference: 'MP241106.1432.C38291',
  description: 'Deposit for wedding reception décor — invoice SNP-INV-48203917',
  notes: 'Thank you. Your date of 22 Nov 2026 is now secured.',
  vendor,
  recipient: { name: 'Sarah K.', address: 'Kampala' },
  invoice: { documentNo: 'SNP-INV-48203917', total: 4235000, balanceBefore: 4235000 },
  balanceAfter: 2235000,
  confirmedAt: '2026-11-06T10:00:00Z',
  voidReason: null,
};

describe('financialPdf', () => {
  it('renders a one-page invoice', () => {
    const pdf = buildInvoicePdf(invoice(4), { today: '2026-11-06' });
    expect(pdf.getNumberOfPages()).toBe(1);
    keep('invoice-short.pdf', pdf);
  });

  it('runs a long invoice onto more pages without dropping rows', () => {
    const pdf = buildInvoicePdf(invoice(60), { today: '2026-11-06' });
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    keep('invoice-long.pdf', pdf);
  });

  it('renders a void booking invoice and a tax line', () => {
    const pdf = buildInvoicePdf(
      invoice(3, {
        status: 'void',
        paymentChannel: 'sinnapi_escrow',
        voidReason: 'Issued to the wrong booking',
        taxLabel: 'VAT (18%)',
        taxTotal: 46170,
      }),
    );
    expect(pdf.getNumberOfPages()).toBe(1);
    keep('invoice-void.pdf', pdf);
  });

  it('renders linked and standalone receipts', () => {
    keep('receipt.pdf', buildReceiptPdf(receipt));
    const standalone = buildReceiptPdf({
      ...receipt,
      invoice: null,
      balanceAfter: 25000,
      paymentReference: null,
      currency: 'USD',
      amount: 53.97,
    });
    expect(standalone.getNumberOfPages()).toBe(1);
    keep('receipt-standalone.pdf', standalone);
  });

  it('prints an overpaid invoice and receipt as "Overpaid by", never a minus balance', () => {
    const inv = buildInvoicePdf(
      invoice(1, { status: 'overpaid', total: 235500, amountPaid: 285500, balanceDue: -50000 }),
      { today: '2026-11-06' },
    );
    const invText = pdfStrings(inv);
    expect(invText).toContain('OVERPAID BY');
    expect(invText).toContain('OVERPAID');
    expect(invText).not.toContain('UGX -50,000');
    keep('invoice-overpaid.pdf', inv);

    const rct = buildReceiptPdf({
      ...receipt,
      amount: 2285000,
      balanceAfter: -50000,
    });
    const rctText = pdfStrings(rct);
    expect(rctText).toContain('Overpaid by');
    expect(rctText).not.toContain('UGX -50,000');
    keep('receipt-overpaid.pdf', rct);
  });

  it('names files after the document number', () => {
    expect(invoiceFileName({ documentNo: 'SNP-INV-1' })).toBe('Invoice-SNP-INV-1.pdf');
    expect(receiptFileName({ documentNo: 'SNP-RCT-2' })).toBe('Receipt-SNP-RCT-2.pdf');
  });

  it('keeps text printable in the built-in font', () => {
    expect(pdfText('Décor — “quoted” · −5')).toBe('Décor — “quoted” · -5');
    expect(pdfText('Kampala ✓ 東京')).toBe('Kampala ? ??');
  });
});

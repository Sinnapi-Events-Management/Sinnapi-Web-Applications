import { describe, expect, it } from 'vitest';
import { buildQuotationPdf, canDownloadQuotation, type QuotationPdfDocument } from './index';
import { fitLogo } from '../financialPdf/logo';
import { termsLines } from './sections/terms';

// A 2×1 transparent PNG — enough for jsPDF to embed and measure.
const WIDE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=';

const doc: QuotationPdfDocument = {
  id: 'q1',
  reference_no: 'SNP-QT-001',
  status: 'sent',
  currency: 'UGX',
  subtotal: 100000,
  discount_total: 0,
  tax_total: 0,
  total: 100000,
  valid_until: null,
  sent_at: '2026-11-01T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  vendor_name: 'Acme Decor',
  vendor_logo_url: 'https://example.com/logo.png',
  client_name: 'Jane',
  event_title: 'Wedding',
  items: [{ description: 'Tent', quantity: 1, unit_price: 100000, line_total: 100000 }],
};

describe('canDownloadQuotation', () => {
  it('lets a client download only a quote that was sent', () => {
    expect(canDownloadQuotation({ sent_at: null, status: 'requested' }, 2, 'client')).toBe(false);
    expect(canDownloadQuotation({ sent_at: 'x', status: 'sent' }, 2, 'client')).toBe(true);
    expect(canDownloadQuotation({ sent_at: 'x', status: 'accepted' }, 2, 'client')).toBe(true);
  });

  it('lets the vendor preview an unsent quote, never an empty one', () => {
    expect(canDownloadQuotation({ sent_at: null, status: 'draft' }, 1, 'vendor')).toBe(true);
    expect(canDownloadQuotation({ sent_at: 'x', status: 'sent' }, 0, 'vendor')).toBe(false);
    expect(canDownloadQuotation(null, 3, 'vendor')).toBe(false);
  });
});

describe('fitLogo', () => {
  it('keeps a wide logo wide inside the box', () => {
    expect(fitLogo({ width: 400, height: 100 }, 150, 48)).toEqual({ width: 150, height: 37.5 });
  });
  it('keeps a square logo square, limited by height', () => {
    expect(fitLogo({ width: 512, height: 512 }, 150, 48)).toEqual({ width: 48, height: 48 });
  });
});

describe('buildQuotationPdf', () => {
  it('renders with the vendor logo', () => {
    const pdf = buildQuotationPdf(doc, { logo: { dataUrl: WIDE_PNG, width: 2, height: 1 } });
    expect(pdf.getNumberOfPages()).toBe(1);
  });
  it('renders initials when there is no logo', () => {
    const pdf = buildQuotationPdf({ ...doc, vendor_logo_url: null });
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});

describe('termsLines', () => {
  it('reads the advance rate as a percentage, as it is stored', () => {
    const [line] = termsLines({
      ...doc,
      total: 2070000,
      advance_rate: 50,
      advance_release_days_before: 7,
    });
    expect(line).toContain('Advance: 50% of the total');
    expect(line).toContain('1,035,000');
    expect(line).toContain('7 days before the event');
  });
});

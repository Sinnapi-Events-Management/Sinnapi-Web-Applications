import { describe, expect, it } from 'vitest';
import { invoicePricing, type PricingInput } from './invoicePricing';

// The same cases `supabase/tests/1105_financial_documents.test.sql` asserts
// against `_invoice_recompute`. If one side changes, both tests must.
const kato: PricingInput = {
  currency: 'UGX',
  lines: [
    { kind: 'item', quantity: 2, unitPrice: 45000 },
    { kind: 'charge', quantity: 1, unitPrice: 150000 },
  ],
  discountType: 'percentage',
  discountValue: 5,
  taxRate: null,
  taxInclusive: false,
};

describe('invoicePricing (mirror of _invoice_recompute)', () => {
  it('UGX, 5% discount on items only, a charge, no tax', () => {
    const p = invoicePricing(kato);
    expect(p).toMatchObject({
      subtotal: 90000,
      discountTotal: 4500,
      chargesTotal: 150000,
      taxableAmount: 235500,
      taxTotal: 0,
      total: 235500,
      discountExceedsSubtotal: false,
    });
    expect(p.lineTotals).toEqual([90000, 150000]);
  });

  it('exclusive 18% tax is added on top', () => {
    const p = invoicePricing({ ...kato, taxRate: 18 });
    expect(p.taxTotal).toBe(42390);
    expect(p.total).toBe(277890);
  });

  it('inclusive 18% tax is worked out from within the total', () => {
    const p = invoicePricing({ ...kato, taxRate: '18', taxInclusive: true });
    expect(p.taxTotal).toBe(35924);
    expect(p.total).toBe(235500);
  });

  it('USD keeps cents and rounds half away from zero', () => {
    const p = invoicePricing({
      currency: 'USD',
      lines: [{ kind: 'item', quantity: 3, unitPrice: 19.99 }],
      discountType: 'percentage',
      discountValue: 10,
      taxRate: null,
      taxInclusive: false,
    });
    expect(p.subtotal).toBe(59.97);
    expect(p.discountTotal).toBe(6);
    expect(p.total).toBe(53.97);
  });

  it('UGX rounds a fractional price to whole shillings before multiplying', () => {
    const p = invoicePricing({
      ...kato,
      lines: [{ kind: 'item', quantity: 1, unitPrice: 1000.5 }],
      discountType: null,
    });
    expect(p.total).toBe(1001);
  });

  it('flags a fixed discount larger than the items', () => {
    const p = invoicePricing({ ...kato, discountType: 'fixed', discountValue: 999999 });
    expect(p.discountExceedsSubtotal).toBe(true);
  });

  it('treats blank and junk inputs as zero / no tax rather than NaN', () => {
    const p = invoicePricing({
      currency: 'UGX',
      lines: [{ kind: 'item', quantity: '', unitPrice: 'abc' }],
      discountType: 'percentage',
      discountValue: '',
      taxRate: '',
      taxInclusive: false,
    });
    expect(p.total).toBe(0);
    expect(Number.isNaN(p.total)).toBe(false);
  });

  it('decimal quantities (2.5 hours) are rounded to 2dp like the column', () => {
    const p = invoicePricing({
      ...kato,
      lines: [{ kind: 'item', quantity: 2.555, unitPrice: 50000 }],
      discountType: null,
    });
    // round(2.555, 2) = 2.56 → 128,000
    expect(p.subtotal).toBe(128000);
  });

  it('reads amounts typed with thousands separators', () => {
    const p = invoicePricing({
      ...kato,
      lines: [{ kind: 'item', quantity: '1', unitPrice: '600,000' }],
      discountType: null,
    });
    expect(p.total).toBe(600000);
  });
});

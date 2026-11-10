import { describe, expect, it } from 'vitest';
import {
  BOOKING_LIST_FILTERS,
  QUOTATION_STATUS_OPTIONS,
  bookingSearchArgs,
  quotationSearchArgs,
  toFacetCounts,
} from './listFilters';

describe('toFacetCounts', () => {
  it('groups RPC rows by facet and coerces bigint strings to numbers', () => {
    expect(
      toFacetCounts([
        { facet: 'status', value: 'confirmed', n: '4' },
        { facet: 'status', value: 'requested', n: 2 },
        { facet: 'payment_type', value: 'escrow', n: '1' },
      ]),
    ).toEqual({ status: { confirmed: 4, requested: 2 }, payment_type: { escrow: 1 } });
  });

  it('skips null values and tolerates a null payload', () => {
    expect(toFacetCounts([{ facet: 'payment_type', value: null, n: 3 }])).toEqual({});
    expect(toFacetCounts(null)).toEqual({});
  });
});

describe('search args', () => {
  it('maps every filter key and nulls the absent ones (client scope)', () => {
    expect(bookingSearchArgs(null, { q: 'BK-1', status: 'confirmed', from: '2026-12-01' })).toEqual(
      {
        p_vendor_id: null,
        p_search: 'BK-1',
        p_status: 'confirmed',
        p_payment_type: null,
        p_terms_status: null,
        p_date_from: '2026-12-01',
        p_date_to: null,
      },
    );
  });

  it('passes the vendor id through for the vendor scope', () => {
    expect(quotationSearchArgs('v1', undefined)).toEqual({
      p_vendor_id: 'v1',
      p_search: null,
      p_status: null,
      p_date_from: null,
      p_date_to: null,
    });
  });
});

describe('vocabularies', () => {
  it('labels voided quotes "Cancelled", as the StatusChip does', () => {
    expect(QUOTATION_STATUS_OPTIONS.find((o) => o.value === 'voided')?.label).toBe('Cancelled');
  });

  it('keeps exactly one inline facet on the bookings toolbar', () => {
    expect(BOOKING_LIST_FILTERS.facets.filter((f) => f.inline).map((f) => f.key)).toEqual([
      'status',
    ]);
  });
});

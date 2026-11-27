import { describe, expect, it } from 'vitest';
import {
  balanceLine,
  formatOwed,
  paymentCoverage,
  paymentCoverageMessage,
} from './paymentCoverage';

describe('paymentCoverage', () => {
  it('reads nothing paid as unpaid', () => {
    expect(paymentCoverage(300000, 0, 'UGX')).toMatchObject({
      state: 'unpaid',
      difference: 300000,
      percent: 0,
    });
  });

  it('reads instalments below the total as short', () => {
    expect(paymentCoverage(300000, 100000, 'UGX')).toMatchObject({
      state: 'short',
      difference: 200000,
    });
  });

  it('reads the exact total as exact', () => {
    expect(paymentCoverage(300000, 300000, 'UGX')).toMatchObject({
      state: 'exact',
      difference: 0,
      percent: 100,
    });
  });

  it('reads more than the total as over, with a positive difference and a capped bar', () => {
    expect(paymentCoverage(300000, 350000, 'UGX')).toMatchObject({
      state: 'over',
      difference: 50000,
      percent: 100,
    });
  });

  it('ignores binary noise in cents', () => {
    expect(paymentCoverage(0.3, 0.1 + 0.2, 'USD').state).toBe('exact');
  });

  it('phrases the flag in plain words', () => {
    expect(paymentCoverageMessage(paymentCoverage(300000, 350000, 'UGX'), 'UGX')).toContain(
      'UGX 50,000 more than the invoice total',
    );
  });
});

describe('balanceLine', () => {
  it('shows what is owed', () => {
    expect(balanceLine(135500, 'UGX')).toEqual({
      label: 'Balance due',
      value: 'UGX 135,500',
      overpaid: false,
    });
  });

  it('never prints a negative balance', () => {
    expect(balanceLine(-50000, 'UGX', 'Outstanding balance')).toEqual({
      label: 'Overpaid by',
      value: 'UGX 50,000',
      overpaid: true,
    });
  });
});

describe('formatOwed', () => {
  it('labels a negative balance as overpaid', () => {
    expect(formatOwed('-50000.00', 'UGX')).toBe('UGX 50,000 overpaid');
    expect(formatOwed(1500, 'UGX')).toBe('UGX 1,500');
  });
});

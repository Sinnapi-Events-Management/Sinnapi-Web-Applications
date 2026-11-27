import { describe, expect, it } from 'vitest';
import { amountInWords, integerInWords } from './amountInWords';
import { addDays, formatDocumentDate, formatDocumentMoney, kampalaToday, roundTo } from './money';
import { invoiceDisplayStatus } from './documentStatus';

describe('integerInWords', () => {
  it.each([
    [0, 'zero'],
    [7, 'seven'],
    [21, 'twenty-one'],
    [105, 'one hundred and five'],
    [235500, 'two hundred and thirty-five thousand five hundred'],
    [1000005, 'one million and five'],
    [2000000, 'two million'],
    [4235000, 'four million two hundred and thirty-five thousand'],
  ])('%i → %s', (n, words) => {
    expect(integerInWords(n)).toBe(words);
  });
});

describe('amountInWords', () => {
  it('UGX has no minor unit', () => {
    expect(amountInWords(2000000, 'UGX')).toBe('Two million Uganda shillings');
    expect(amountInWords(1, 'UGX')).toBe('One Uganda shilling');
  });
  it('USD spells cents', () => {
    expect(amountInWords(53.97, 'USD')).toBe('Fifty-three US dollars and ninety-seven cents');
    expect(amountInWords(1.01, 'usd')).toBe('One US dollar and one cent');
  });
});

describe('money and dates', () => {
  it('formats with the currency code and its own decimals', () => {
    expect(formatDocumentMoney(4235000, 'UGX')).toBe('UGX 4,235,000');
    expect(formatDocumentMoney('53.9', 'USD')).toBe('USD 53.90');
  });
  it('rounds the way Postgres does', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-2.5, 0)).toBe(-3);
  });
  it('reads calendar dates without shifting them', () => {
    expect(formatDocumentDate('2026-11-19')).toBe('19 Nov 2026');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
  it("uses Kampala's date, not the browser's", () => {
    // 22:30 UTC is already the next day in Kampala (UTC+3).
    expect(kampalaToday(new Date('2026-11-05T22:30:00Z'))).toBe('2026-11-06');
  });
});

describe('invoiceDisplayStatus', () => {
  it('shows overdue only for unpaid issued invoices past their due date', () => {
    expect(invoiceDisplayStatus('issued', '2026-11-01', '2026-11-05')).toBe('overdue');
    expect(invoiceDisplayStatus('partially_paid', '2026-11-01', '2026-11-05')).toBe('overdue');
    expect(invoiceDisplayStatus('issued', '2026-11-05', '2026-11-05')).toBe('issued');
    expect(invoiceDisplayStatus('paid', '2026-11-01', '2026-11-05')).toBe('paid');
    expect(invoiceDisplayStatus('draft', '2026-11-01', '2026-11-05')).toBe('draft');
  });
});

describe('amount inputs', () => {
  it('accepts commas and spaces, and nothing else changes the value', async () => {
    const { amountInputNumber, cleanAmountInput } = await import('./money');
    expect(cleanAmountInput('600,000')).toBe('600000');
    expect(cleanAmountInput(' 1 250 000 ')).toBe('1250000');
    expect(amountInputNumber('600,000')).toBe(600000);
    expect(Number.isNaN(amountInputNumber(''))).toBe(true);
    expect(Number.isNaN(amountInputNumber('abc'))).toBe(true);
  });
});

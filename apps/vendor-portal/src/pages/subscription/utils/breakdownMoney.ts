import { formatMoney } from '@/lib/config';

/**
 * `formatMoney` in the shape `MoneyBreakdown`'s `format` prop takes, so the
 * breakdown's lines print in the same notation as the total and the Pay
 * button.
 */
export function breakdownMoney(amount: number | string | null | undefined, currency: string) {
  return formatMoney(amount == null ? null : Number(amount), currency);
}

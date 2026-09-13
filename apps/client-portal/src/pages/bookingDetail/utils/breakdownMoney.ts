import { formatMoney } from '@/lib/config';

/**
 * `formatMoney` in the shape `MoneyBreakdown`'s `format` prop takes.
 *
 * Passing it is what keeps a breakdown's lines in the same notation as the
 * total above them. Without it the kit falls back to its own ISO-code
 * formatter, and the escrow checkout printed `USh 906,400` on the Pay button
 * and `UGX 800,000` two lines below it.
 */
export function breakdownMoney(amount: number | string | null | undefined, currency: string) {
  return formatMoney(amount == null ? null : Number(amount), currency);
}

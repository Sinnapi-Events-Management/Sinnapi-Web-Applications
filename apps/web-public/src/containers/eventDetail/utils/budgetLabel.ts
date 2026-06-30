import { formatMoney } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';

/** Full budget label from the event's [min, max] range; null when unpriced. */
export function budgetLabel(event: EventCardModel): string | null {
  const { currency } = event;
  const min = event.budget_min;
  const max = event.budget_max;
  if (min != null && max != null)
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  if (min != null) return `From ${formatMoney(min, currency)}`;
  if (max != null) return `Up to ${formatMoney(max, currency)}`;
  return null;
}

/** The localized currency symbol for a code (e.g. 'UGX' → 'USh'); code as fallback. */
function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat('en-UG', { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * Abbreviate a number to a short, human magnitude: 5_000_000 → '5M',
 * 1_500_000 → '1.5M', 800_000 → '800K', 1_200_000_000 → '1.2B'. Keeps one
 * decimal only when it adds information.
 */
function compactAmount(value: number): string {
  const units: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [threshold, suffix] of units) {
    if (Math.abs(value) >= threshold) {
      const scaled = Math.round((value / threshold) * 10) / 10;
      return `${Number.isInteger(scaled) ? scaled.toFixed(0) : scaled.toFixed(1)}${suffix}`;
    }
  }
  return `${value}`;
}

/**
 * Compact budget label for tight spaces (e.g. the highlights tile), e.g.
 * 'USh 8M – 15M' instead of 'USh 8,000,000 – USh 15,000,000'. Uses the currency
 * symbol once and stays short enough to sit on a single line in a tile.
 */
export function compactBudgetLabel(event: EventCardModel): string | null {
  const min = event.budget_min;
  const max = event.budget_max;
  if (min == null && max == null) return null;

  const symbol = currencySymbol(event.currency ?? 'UGX');
  const amount = (value: number) => `${symbol} ${compactAmount(value)}`;

  if (min != null && max != null) {
    return min === max ? amount(min) : `${amount(min)} – ${compactAmount(max)}`;
  }
  if (min != null) return `From ${amount(min)}`;
  return `Up to ${amount(max as number)}`;
}

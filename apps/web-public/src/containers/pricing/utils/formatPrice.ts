/**
 * Formats a catalogue price for display, e.g. `49000, 'UGX'` → "UGX 49,000".
 *
 * The locale is pinned rather than taken from the visitor: this renders on the
 * server into an ISR snapshot and again in the browser, and a locale-dependent
 * separator would differ between the two and trip a hydration mismatch on the
 * page's most prominent number.
 *
 * `narrowSymbol` gives "$49" for USD while leaving UGX — which has no symbol —
 * as "UGX 49,000", which is how the currency is written locally. Fractions are
 * dropped because a headline price with cents in it reads as noise, and every
 * plan in the catalogue is priced in whole units.
 */
export function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(value);
}

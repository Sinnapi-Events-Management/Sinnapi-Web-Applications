/**
 * Value formatting for the quotation document.
 *
 * A local copy of the three formatters every portal's `lib/config` carries,
 * kept identical to them on purpose: the figure a vendor reads on the booking
 * page and the figure their client reads in the PDF are the same number, and
 * they must be written the same way. It is a copy rather than an import because
 * this package is a leaf — reaching into an app's `lib/config` from here would
 * point the dependency the wrong way round, and there are three of them.
 */

/** `null` renders as an em dash rather than a zero — absent is not free. */
export function formatMoney(amount: number | null | undefined, currency: string | null): string {
  if (amount == null) return '—';
  const cur = currency ?? 'UGX';
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown ISO code throws rather than falling back, and a document that
    // fails to render is worse than one that prefixes the raw code.
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function titleize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

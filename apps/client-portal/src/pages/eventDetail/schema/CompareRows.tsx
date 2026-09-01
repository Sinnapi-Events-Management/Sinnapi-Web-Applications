import type { ReactNode } from 'react';
import { formatAmount, formatRate } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { QuoteComparisonModel } from '@/lib/types';

/**
 * What a quote comparison compares, as data.
 *
 * ONE DEFINITION, TWO LAYOUTS. The desktop comparison is a grid of columns and
 * the phone one is a stack of per-attribute blocks — genuinely different
 * arrangements, which is the point: usability work on comparison tools is
 * consistent that shrinking a table is not a mobile design. Driving both from
 * this list is what stops them drifting into showing different attributes, in
 * different orders, with different winners.
 *
 * `best` is the reason this is worth building at all. The same research finds
 * that users struggle to READ a comparison once they have built one — the
 * columns are dense and every cell looks equally important. Marking which
 * column wins each attribute turns the grid from a table into an answer, and it
 * is only ever applied where "better" is objectively true: a lower price is
 * better, a lower deposit is better, a live quote beats an expired one. It is
 * deliberately NOT applied to things like the number of line items, where more
 * is not better and a tick would be an opinion dressed as a fact.
 */
export type CompareRow = {
  key: string;
  label: string;
  /** Explains the attribute where the label alone would not. */
  hint?: string;
  render: (q: QuoteComparisonModel) => ReactNode;
  /**
   * The quotation that wins this attribute, or null when nothing does — a tie,
   * or an attribute with no objective winner. Ties return null on purpose:
   * marking two columns "best" tells the reader nothing and marking the first
   * one would be arbitrary.
   */
  best?: (rows: QuoteComparisonModel[]) => string | null;
};

/** The single winner by a numeric key, or null if absent, tied, or unusable. */
function lowestBy(
  rows: QuoteComparisonModel[],
  pick: (q: QuoteComparisonModel) => number | null | undefined,
): string | null {
  const usable = rows.filter((r) => pick(r) != null);
  if (usable.length < 2) return null;
  const min = Math.min(...usable.map((r) => pick(r) as number));
  const winners = usable.filter((r) => pick(r) === min);
  return winners.length === 1 ? winners[0].quotation_id : null;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    key: 'total',
    label: 'Total',
    hint: 'What the vendor is charging, restated in your budget currency where it differs.',
    render: (q) => {
      const converted =
        q.currency !== q.event_currency && q.total_in_event_currency != null
          ? ` (≈ ${formatAmount(q.total_in_event_currency, q.event_currency)})`
          : '';
      return `${formatAmount(q.total, q.currency)}${converted}`;
    },
    best: (rows) => lowestBy(rows, (q) => q.total_in_event_currency ?? null),
  },
  {
    key: 'vs_allocation',
    label: 'Against what you set aside',
    render: (q) => {
      if (q.allocated_amount == null) return 'No amount set aside for this line';
      const amount = q.total_in_event_currency ?? q.total;
      const diff = q.allocated_amount - amount;
      return diff >= 0
        ? `${formatAmount(diff, q.event_currency)} under`
        : `${formatAmount(Math.abs(diff), q.event_currency)} over`;
    },
  },
  {
    key: 'deposit',
    label: 'Paid up front',
    hint: 'The share released to the vendor before the event. Your booking inherits this from the quote you accept.',
    render: (q) =>
      q.advance_rate == null
        ? 'Not stated'
        : `${formatRate(q.advance_rate)}${
            q.advance_release_days_before != null
              ? ` · ${q.advance_release_days_before} days before`
              : ''
          }`,
    best: (rows) => lowestBy(rows, (q) => q.advance_rate),
  },
  {
    key: 'valid',
    label: 'Valid until',
    render: (q) =>
      q.valid_until == null
        ? 'No expiry'
        : q.is_expired
          ? `Expired ${formatDate(q.valid_until)}`
          : formatDate(q.valid_until),
    // A live quote beats an expired one; among live quotes, none is "best" for
    // being valid longer — a client is choosing a caterer, not a deadline.
    best: (rows) => {
      const live = rows.filter((r) => !r.is_expired);
      return live.length === 1 && rows.length > 1 ? live[0].quotation_id : null;
    },
  },
  {
    key: 'discount',
    label: 'Discount',
    render: (q) =>
      q.discount_total > 0
        ? `${formatAmount(q.discount_total, q.currency)}${
            q.discount_rate ? ` (${formatRate(q.discount_rate)})` : ''
          }`
        : 'None',
  },
  {
    key: 'tax',
    label: 'Tax',
    render: (q) =>
      q.tax_total > 0
        ? `${formatAmount(q.tax_total, q.currency)}${q.tax_inclusive ? ' (included)' : ' (added)'}`
        : 'None',
  },
  {
    key: 'items',
    label: "What's included",
    // No `best`: more line items is not a better offer, and a tick here would
    // be an opinion presented as a fact.
    render: (q) =>
      q.item_count === 0
        ? 'Not itemised'
        : q.items
            .map((i) => i.description)
            .filter(Boolean)
            .join(' · '),
  },
  {
    key: 'vendor_rating',
    label: 'Rating',
    render: (q) =>
      q.review_count && q.review_count > 0
        ? `${Number(q.avg_rating ?? 0).toFixed(1)} from ${q.review_count} review${
            q.review_count === 1 ? '' : 's'
          }`
        : 'No reviews yet',
  },
  {
    key: 'reference',
    label: 'Reference',
    render: (q) => q.reference_no,
  },
];

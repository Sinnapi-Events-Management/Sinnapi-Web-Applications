/**
 * A quotation's money, derived once and read by both portals. Pure (no
 * React/MUI), for the same reason `money.ts` and `quotationTransitions.ts` are:
 * the client and the vendor are looking at one deal, and a total that reads
 * `UGX 226,600` on one screen and `UGX 0` on the other is not a formatting
 * difference — it is the two parties disagreeing about the price.
 *
 * WHY THIS EXISTS AT ALL
 * `quotations.total` is written once, by `send_quotation`, and every screen
 * since has read it straight off the row. That is one write standing between a
 * priced quote and a page that says the work is free — and when it is missed,
 * the zero does not stay on the page: acceptance carries it onto the booking
 * and escrow prices the deal at nothing.
 *
 * So the stored total is treated as the *claim* and the line items as the
 * *evidence*. Where the row says zero and the lines say otherwise, the lines
 * win. That is not the fix — the fix is the server writing and carrying the
 * total, in `20260816000009_quotation_price_carries.sql` — but a price is the
 * one figure on these pages that must never be understated, and a UI that can
 * only be as right as one column is a UI with a single point of failure.
 *
 * Nothing here invents money. A quote with no line items derives nothing and
 * stays unpriced: "the vendor has not answered yet" and "this costs nothing"
 * are different sentences, and only one of them is ever true here.
 */

/** A line item, as loosely as PostgREST may hand one back. */
export type QuotationLineItemLike = {
  quantity?: number | string | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
};

/** The money columns of a quotation row. */
export type QuotationMoneyLike = {
  currency?: string | null;
  subtotal?: number | string | null;
  discount_total?: number | string | null;
  tax_total?: number | string | null;
  total?: number | string | null;
};

export type QuotationPricing = {
  currency: string;
  subtotal: number;
  /** Always positive. Presentation decides whether to render it as a minus. */
  discount: number;
  tax: number;
  total: number;
  /**
   * The vendor has built a quote — there is at least one line item. Kept as
   * "has lines" rather than "has a total" on purpose: a genuinely free line is
   * a quote, a missing total is not.
   */
  isPriced: boolean;
  /**
   * The stored total was zero or absent and the line items were used instead.
   * A screen that wants to say so — or a log that wants to count it — can.
   */
  isDerived: boolean;
};

/** How an accepted total divides between the advance and the protected balance. */
export type QuotationAdvanceSplit = {
  /** The percentage itself, `0` when none was proposed. */
  rate: number;
  /** Whether the vendor proposed terms at all, as opposed to proposing 0%. */
  hasTerms: boolean;
  /** Whether any money moves up front. `false` at 0%, which is a real choice. */
  hasAdvance: boolean;
  advance: number;
  /** What stays in escrow until the client confirms delivery. */
  balance: number;
};

/** Money to the cent, so a rate applied to a total cannot drift by a fraction. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A stored numeric as a number.
 *
 * PostgREST returns `numeric` as a JSON number, but a `numeric` that has been
 * through a form, a URL or a jsonb round-trip can arrive as a string — and
 * `'0' * 1` is 0 while `'12000' - 0` is not, so guessing per call site is how
 * one screen ends up disagreeing with another. Anything unreadable is 0, never
 * `NaN`: a total that formats as `UGX NaN` is worse than one that is wrong.
 */
function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * What one line is worth.
 *
 * `line_total` is the stored product and is trusted when it carries a value;
 * quantity × unit price is the fallback for a row written without it. Both are
 * present in the schema, and the two disagreeing is a data fault rather than
 * something to average.
 */
export function lineItemAmount(item: QuotationLineItemLike): number {
  const stored = toAmount(item.line_total);
  if (stored !== 0) return stored;
  const quantity =
    item.quantity === null || item.quantity === undefined ? 1 : toAmount(item.quantity);
  return round2(quantity * toAmount(item.unit_price));
}

/** What the lines add up to before discount and tax. */
export function lineItemsSubtotal(items: readonly QuotationLineItemLike[] = []): number {
  return round2(items.reduce((sum, item) => sum + lineItemAmount(item), 0));
}

/**
 * The figures a quotation page shows, resolved against its line items.
 *
 * The order is the order the client reads them in: the lines add up to a
 * subtotal, the vendor's discount comes off, tax goes on, and what is left is
 * the number being agreed to.
 */
export function quotationPricing(
  quotation: QuotationMoneyLike | null | undefined,
  items: readonly QuotationLineItemLike[] = [],
): QuotationPricing {
  const currency = quotation?.currency ?? 'UGX';
  const lines = lineItemsSubtotal(items);

  const storedSubtotal = toAmount(quotation?.subtotal);
  const storedTotal = toAmount(quotation?.total);
  const discount = Math.abs(toAmount(quotation?.discount_total));
  const tax = toAmount(quotation?.tax_total);

  // A stored zero next to priced lines is the failure this module exists for.
  // Anything non-zero is the vendor's own arithmetic and is left alone — including
  // a hand-adjusted total that does not match its lines, which is theirs to set.
  const subtotal = storedSubtotal !== 0 ? storedSubtotal : lines;
  const derived = round2(subtotal - discount + tax);
  const total = storedTotal !== 0 ? storedTotal : derived;

  return {
    currency,
    subtotal,
    discount,
    tax,
    total,
    isPriced: items.length > 0,
    isDerived: storedTotal === 0 && derived !== 0,
  };
}

/**
 * How a total divides under the proposed advance terms.
 *
 * `hasTerms` and `hasAdvance` are separate because 0% is a real answer — "no
 * advance, everything held until delivery" — and must not render the same as a
 * quote whose terms were never set.
 */
export function advanceSplit(
  total: number | string | null | undefined,
  rate: number | string | null | undefined,
): QuotationAdvanceSplit {
  const hasTerms = rate !== null && rate !== undefined && rate !== '';
  const pct = Math.max(0, toAmount(rate));
  const amount = toAmount(total);
  const advance = round2((amount * pct) / 100);

  return {
    rate: pct,
    hasTerms,
    hasAdvance: hasTerms && pct > 0,
    advance,
    balance: round2(amount - advance),
  };
}

/**
 * The advance terms as one line of prose, for a record row rather than a money
 * split. Null when no terms were proposed, so a caller can drop the row instead
 * of printing an em dash next to a label about payment.
 */
export function advanceTermsSummary(
  rate: number | string | null | undefined,
  daysBefore: number | null | undefined,
): string | null {
  const split = advanceSplit(0, rate);
  if (!split.hasTerms) return null;
  if (!split.hasAdvance) return 'No advance — full amount held until delivery';

  const percent = `${Number(split.rate.toFixed(2))}%`;
  return daysBefore != null && daysBefore > 0
    ? `${percent}, released ${daysBefore} days before the event`
    : percent;
}

/** How a booking's amount stands against the quote it was made from. */
export type QuoteVariance = {
  /** Both figures are known, so the comparison means something. */
  comparable: boolean;
  quoted: number;
  booked: number;
  /** Signed: positive when the booking is above the quote. */
  delta: number;
  /** `delta` as a share of the quoted total, `0` when the quote was free. */
  percent: number;
  differs: boolean;
  direction: 'above' | 'below' | 'match';
};

/**
 * The booking amount against the quoted total.
 *
 * Worth stating rather than leaving to the reader's arithmetic, and worth
 * stating in all three portals identically. A booking is created at the
 * quote's total, but `amount` is an ordinary column on an ordinary row from
 * then on — a renegotiation, a correction or a mistake moves it, and the
 * quotation it came from does not move with it. Where the two disagree, the
 * page should say so before anyone pays against the wrong one.
 *
 * A tolerance of one minor unit absorbs the rounding that a `numeric` column
 * arriving as a string can pick up on the way here; anything larger is a real
 * difference and is reported as one.
 */
export function quoteVariance(
  quotedTotal: number | string | null | undefined,
  bookedAmount: number | string | null | undefined,
): QuoteVariance {
  const quoted = toAmount(quotedTotal);
  const booked = toAmount(bookedAmount);
  const comparable = quoted > 0 && bookedAmount !== null && bookedAmount !== undefined;
  const delta = round2(booked - quoted);
  const differs = comparable && Math.abs(delta) >= 1;

  return {
    comparable,
    quoted,
    booked,
    delta,
    percent: quoted > 0 ? round2((delta / quoted) * 100) : 0,
    differs,
    direction: !differs ? 'match' : delta > 0 ? 'above' : 'below',
  };
}

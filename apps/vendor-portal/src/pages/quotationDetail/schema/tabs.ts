/**
 * The quotation page's five sections, mirrored into the URL
 * (`/quotations/:id?tab=payment`).
 *
 * The split is by the question being asked, not by data source: "what is this
 * request" (overview), "what did I quote" (quote), "what does it pay me and
 * when" (payment), "what have we said to each other" (messages), "what has
 * become of it" (progress). Seven cards in two columns meant a vendor checking
 * their advance scrolled past the brief, the builder and the whole record to
 * reach it — and on a phone, where the columns collapse into one, past all of
 * it.
 *
 * Overview leads because it answers the question someone opening a quote
 * usually has, and it is the default — represented by the *absence* of the
 * parameter, so `/quotations/:id` stays canonical and adding a section later
 * can never re-point an existing link.
 *
 * `messages` sits fourth rather than last, which is a claim about how often it
 * is wanted: a quote that has been sent back is answered by talking, and the
 * bar scrolls horizontally on a phone, so the far-right slot is the one that
 * has to be discovered. `progress` keeps the end because it is the only section
 * that is purely a record — nothing on it is ever the next thing to do.
 *
 * The client's page uses the same five names in the same order, which is
 * deliberate: the two sides are looking at one object and should recognise each
 * other's screen.
 */
export const QUOTATION_TABS = ['overview', 'quote', 'payment', 'messages', 'progress'] as const;

export type QuotationTab = (typeof QUOTATION_TABS)[number];

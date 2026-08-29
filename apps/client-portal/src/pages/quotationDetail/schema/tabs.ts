/**
 * The quotation page's five sections, mirrored into the URL
 * (`/quotations/:id?tab=payment`).
 *
 * The split is by the question being asked, not by data source: "what is this
 * quote" (overview), "what does it cover" (quote), "what will I pay and when"
 * (payment), "what have we said to each other" (messages), "what has become of
 * it" (progress). Eight cards in two columns collapsed into one long scroll on
 * a phone, so a client checking what they owe up front passed the whole
 * breakdown, the record and the trail to reach it.
 *
 * Overview leads because it answers the question someone opening a quote
 * usually has, and it is the default — represented by the *absence* of the
 * parameter, so `/quotations/:id` stays canonical and adding a section later
 * can never re-point an existing link.
 *
 * `messages` sits fourth rather than last, which is a claim about how often it
 * is wanted: the commonest thing a client does after reading a quote is ask one
 * question about it, and the bar scrolls horizontally on a phone, so the
 * far-right slot is the one that has to be discovered. `progress` keeps the end
 * because it is the only section that is purely a record.
 *
 * `progress` is also linked to by name: the quotations list's "Create booking"
 * shortcut carries `?tab=progress&book=1`, because the card holding that dialog
 * lives in that section and an inactive panel is unmounted. Renaming a value
 * here means fixing that link too.
 *
 * The vendor's page uses the same five names in the same order, which is
 * deliberate: the two sides are looking at one object and should recognise each
 * other's screen.
 */
export const QUOTATION_TABS = ['overview', 'quote', 'payment', 'messages', 'progress'] as const;

export type QuotationTab = (typeof QUOTATION_TABS)[number];

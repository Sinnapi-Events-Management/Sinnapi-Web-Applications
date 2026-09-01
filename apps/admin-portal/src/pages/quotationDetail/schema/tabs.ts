/**
 * The console quotation page's four sections, mirrored into the URL
 * (`/quotations/:id?tab=quote`).
 *
 * The split is by the question an operator is answering: "what is this quote
 * and who is it between" (overview), "what does it actually price" (quote),
 * "what would it have paid and when" (payment), "how did it get here" (progress).
 *
 * Four sections under the same names as the vendor's and client's pages, which
 * matters more here than on either of them: an operator on a support call is
 * looking at this screen while the other party describes theirs, and "the
 * Payment tab" has to mean the same thing on both.
 *
 * Overview leads and is the default — represented by the *absence* of the
 * parameter, so `/quotations/:id` stays canonical and adding a section later
 * can never re-point an existing link.
 */
export const QUOTATION_TABS = ['overview', 'quote', 'payment', 'progress'] as const;

export type QuotationTab = (typeof QUOTATION_TABS)[number];

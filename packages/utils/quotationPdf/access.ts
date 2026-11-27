/**
 * Who may download a quotation as a PDF, and when.
 *
 * One rule for both portals, so the button never shows on one side and not
 * the other for the same quote.
 *
 * - A client: only once the quote has actually been sent to them (`sent_at`
 *   is set). A quote the vendor is still working on is not theirs to file.
 * - The vendor: any quote with priced lines, including unsent ones — so they
 *   can check what the client will receive. Drafts print with a DRAFT stamp.
 *
 * Either way there must be at least one line: an empty quote is not a document.
 */
export type QuotationViewer = 'vendor' | 'client';

export function canDownloadQuotation(
  quotation: { sent_at: string | null; status: string } | null | undefined,
  itemCount: number,
  viewer: QuotationViewer,
): boolean {
  if (!quotation || itemCount === 0) return false;
  if (viewer === 'vendor') return true;
  return !!quotation.sent_at && quotation.status !== 'draft';
}

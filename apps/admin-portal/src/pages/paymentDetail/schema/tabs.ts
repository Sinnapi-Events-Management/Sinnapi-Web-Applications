/**
 * The payment page's sections, mirrored into the URL
 * (`/payments/:id?tab=payloads`).
 *
 * Split by the question an investigator is answering, in the order they ask
 * them: "what happened to this transaction, in order, and who did each part"
 * (trace), "what is this and what did it fund" (overview), "which deliveries
 * did the provider make" (deliveries), "what exactly was said" (payloads), and
 * "what has reconciliation found" (exceptions).
 *
 * TRACE IS FIRST AND IS THE DEFAULT, which is a change. Overview used to be,
 * and it answers a question nobody opens this page to ask — the payments list
 * already showed the amount, the status and the payer. What sent an
 * investigator here is "this went wrong, what happened", and until 20260904
 * there was no view that answered it: the story was spread across seven tables
 * joined by four different keys, and the audit rows in the middle of it named
 * nobody. The trace is that answer, so it is what the page opens on.
 *
 * `deliveries` is the old `timeline` renamed. It was never a timeline of the
 * transaction — it is `payment_events`, the provider's delivery attempts and
 * the idempotency gate — and calling it one is what made the absence of a real
 * timeline hard to notice. The old value is still accepted as a URL alias so
 * links already pasted into reconciliation notes keep working (see
 * `normalisePaymentTab`).
 *
 * The default is represented by the *absence* of the parameter, so
 * `/payments/:id` stays canonical.
 */
export const PAYMENT_TABS = ['trace', 'overview', 'deliveries', 'payloads', 'exceptions'] as const;

export type PaymentTab = (typeof PAYMENT_TABS)[number];

/**
 * Resolve a `tab` query value, accepting the names this page used to use.
 *
 * `?tab=timeline` is what the deliveries section was called until 20260904, and
 * those links are in reconciliation notes and support tickets already. An
 * unrecognised value falls through to the default rather than rendering a blank
 * panel.
 */
export function normalisePaymentTab(raw: string | null | undefined): PaymentTab | null {
  if (!raw) return null;
  if (raw === 'timeline') return 'deliveries';
  return (PAYMENT_TABS as readonly string[]).includes(raw) ? (raw as PaymentTab) : null;
}

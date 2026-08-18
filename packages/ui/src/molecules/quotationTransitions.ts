/**
 * The quotation lifecycle, as data. Pure (no React/MUI), shared by the client
 * and vendor portals — the same reason `bookingTransitions` lives beside it.
 *
 * Every state write a quotation can receive is described once here: which
 * states it may be reached from, who is allowed to ask for it, what it actually
 * does, and how loudly to say so. The `from` sets and `actors` mirror
 * `respond_quotation` and `void_quotation` deliberately. The server is the
 * enforcement; this is the UI declining to offer a button the server would
 * refuse, which is a different job and needs its own copy of the rule.
 */

import { rpcErrorMessage } from './rpcError';

/**
 * The path a quotation walks when nothing goes wrong.
 *
 * `draft` is on it because it is a real state a vendor's quote sits in while
 * they build it, and the client's trail is more honest for showing it — "your
 * vendor is putting this together" is information, where a jump from Requested
 * straight to Sent implies nothing is happening.
 */
export const QUOTATION_LIFECYCLE = ['requested', 'draft', 'sent', 'accepted'] as const;

export type QuotationLifecycleStatus = (typeof QUOTATION_LIFECYCLE)[number];

/** Statuses after `status` on the happy path; empty once the quote has exited it. */
export function remainingQuotationLifecycle(status: string): string[] {
  const at = QUOTATION_LIFECYCLE.indexOf(status as QuotationLifecycleStatus);
  return at === -1 ? [] : QUOTATION_LIFECYCLE.slice(at + 1);
}

/** Terminal states — nothing follows, so no action panel is worth drawing. */
export function isQuotationSettled(status: string): boolean {
  return ['accepted', 'declined', 'expired', 'voided'].includes(status);
}

/**
 * Whether a quote's validity window has closed.
 *
 * Nothing in the schema moves a quotation to `expired` when its date passes, so
 * a `sent` quote three weeks past `valid_until` still reads as `sent` in the
 * status column. `valid_until` is the only truth about whether the offer is
 * still live, and `respond_quotation` enforces it on accept — so the UI checks
 * the same column rather than the status, or it would offer an Accept button
 * the server is going to reject.
 */
export function isQuoteLapsed(validUntil: string | null | undefined, now: Date = new Date()) {
  if (!validUntil) return false;
  const at = new Date(validUntil).getTime();
  return Number.isFinite(at) && at < now.getTime();
}

/**
 * Whether a quote has no price on it, and so nothing to accept.
 *
 * The second gate `respond_quotation` applies that a status cannot express, and
 * the more serious of the two: a lapsed quote was a real offer that ran out of
 * time, where this one was never an offer at all. Accepting it binds nothing,
 * and everything downstream is a percentage of the figure it does not have —
 * the booking's amount, the advance, escrow's commission and the payout. A zero
 * accepted here does not stay on the quotation; it becomes a booking worth
 * nothing that the client then cannot pay for.
 *
 * Reads the stored total deliberately, not the total the page displays.
 * `quotationPricing` will fall back to the line items so the client is never
 * shown `UGX 0` over priced rows — but the server checks `quotations.total`,
 * and a UI that offered Accept on a figure the server does not have would be
 * offering a button it is about to be refused for. Where the two disagree the
 * quote is broken, and the honest answer is that it cannot be accepted until
 * the vendor sends it again.
 */
export function isQuoteUnpriced(total: number | string | null | undefined): boolean {
  if (total === null || total === undefined || total === '') return true;
  const value = typeof total === 'string' ? Number(total) : total;
  return !Number.isFinite(value) || value <= 0;
}

/**
 * The writes the two parties to a quotation can make.
 *
 * `void` and `withdraw` are one server call (`void_quotation`) split into two
 * entries because they are not the same act. A client voids a request they no
 * longer need; a vendor withdraws a price they can no longer honour. Same
 * outcome, opposite subject — and a dialog that says "the vendor is told you
 * have withdrawn this" to the vendor is the kind of copy that makes people
 * hesitate over a button they understood perfectly well a moment earlier.
 */
export const QUOTATION_ACTIONS = ['accept', 'revise', 'void', 'withdraw'] as const;

export type QuotationAction = (typeof QUOTATION_ACTIONS)[number];

/** Which side of a quotation may ask for a transition. */
export type QuotationActor = 'client' | 'vendor';

export type QuotationActionSpec = {
  action: QuotationAction;
  /** Button label. */
  label: string;
  /** Dialog heading. `{ref}` is replaced with the quotation reference. */
  title: string;
  /**
   * What actually happens — the consequence, never "are you sure". Accepting a
   * quote binds a price and opens the payment step; voiding one ends it for
   * both sides. The modal's job is to say what the tap will cause.
   */
  description: string;
  confirmLabel: string;
  /** Drives the dialog badge and the primary button colour. */
  tone: 'primary' | 'secondary' | 'error' | 'success';
  /** Statuses the action is offered from. */
  from: readonly string[];
  /** Portals that may offer it. */
  actors: readonly QuotationActor[];
  /** Whether the party must give a reason. Server-enforced for void/withdraw. */
  requiresReason: boolean;
  /** Helper under the reason field, naming who will read it. */
  reasonHelperText?: string;
};

const SPECS: Record<QuotationAction, QuotationActionSpec> = {
  accept: {
    action: 'accept',
    label: 'Accept quote',
    title: 'Accept quote {ref}?',
    description:
      'This agrees the price and the payment terms shown above, and the vendor is told you have ' +
      'accepted. You then pick a date and create the booking, which carries these terms and is ' +
      'what the payment step asks you to fund. You can still cancel the booking afterwards, but ' +
      'the quote itself cannot be un-accepted.',
    confirmLabel: 'Accept quote',
    tone: 'success',
    from: ['sent', 'revised'],
    actors: ['client'],
    requiresReason: false,
  },
  revise: {
    action: 'revise',
    label: 'Request changes',
    title: 'Ask for changes to {ref}?',
    description:
      'The quote goes back to the vendor to rework, and the current numbers stop being an offer ' +
      'you can accept. Say what needs to change — a quote returned without a note leaves the ' +
      'vendor guessing at which line you meant.',
    confirmLabel: 'Send it back',
    tone: 'primary',
    from: ['sent', 'revised'],
    actors: ['client'],
    // Not enforced by the server, but a revision request with no note is a
    // round trip that achieves nothing. Required here, where the cost of
    // asking is one sentence.
    requiresReason: true,
    reasonHelperText: 'Shared with the vendor and kept on the quotation’s record.',
  },
  void: {
    action: 'void',
    label: 'Void quotation',
    title: 'Void quotation {ref}?',
    description:
      'This ends the quote for both sides. The vendor is told you no longer need it and cannot ' +
      'reply to it again. Nothing is charged and no booking is affected — but if you change your ' +
      'mind you will have to request a fresh quote.',
    confirmLabel: 'Void quotation',
    tone: 'error',
    from: ['requested', 'sent', 'revised'],
    actors: ['client'],
    requiresReason: true,
    reasonHelperText: 'Shared with the vendor and kept on the quotation’s record.',
  },
  withdraw: {
    action: 'withdraw',
    label: 'Withdraw quote',
    title: 'Withdraw quote {ref}?',
    description:
      'This takes your price off the table. The client is told it is no longer available and can ' +
      'no longer accept it, and the quote cannot be re-sent — a new price means a new quote. Use ' +
      'this when you cannot honour what you quoted, not to correct a typo.',
    confirmLabel: 'Withdraw quote',
    tone: 'error',
    // Never `requested`: that is the client's ask sitting in the queue, not
    // the vendor's offer, and declining to quote is done by letting it lapse.
    from: ['draft', 'sent', 'revised'],
    actors: ['vendor'],
    requiresReason: true,
    reasonHelperText: 'Shared with the client and kept on the quotation’s record.',
  },
};

export function quotationActionSpec(action: QuotationAction): QuotationActionSpec {
  return SPECS[action];
}

/**
 * The actions this portal may offer for a quotation in this state, in the order
 * they should appear.
 *
 * The validity window is layered on top by the caller rather than folded in
 * here: it is not knowable from a status, and it only blocks `accept` — a
 * client may still send a lapsed quote back or void it, which is how they tell
 * the vendor where things stand.
 */
export function availableQuotationActions(
  status: string,
  actor: QuotationActor,
): QuotationActionSpec[] {
  return QUOTATION_ACTIONS.map((a) => SPECS[a]).filter(
    (s) => s.from.includes(status) && s.actors.includes(actor),
  );
}

/** `void_quotation` and `respond_quotation` refusals, in plain language. */
const QUOTATION_ACTION_ERRORS: Record<string, string> = {
  quotation_not_voidable:
    'This quotation has already been settled, so it can no longer be withdrawn.',
  quotation_not_answerable: 'This quotation is no longer open for a response.',
  quotation_expired:
    'This quote has passed its valid-until date, so it can no longer be accepted. Ask the vendor ' +
    'for a fresh one.',
  // The server refuses to bind a price of zero, because everything downstream —
  // the booking, the advance, escrow — is a percentage of it. Named as the
  // vendor's omission, which is what it is: the client cannot fix this.
  quotation_not_priced:
    'This quote has no price on it yet, so there is nothing to accept. Ask the vendor to send the ' +
    'priced quote.',
  invalid_action: 'That is not a response this quotation can take.',
  reason_required: 'A reason is required for this change.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  not_found: 'This quotation no longer exists.',
  forbidden: 'You do not have permission to change this quotation.',
};

/**
 * Turns whatever `respond_quotation` or `void_quotation` failed with into
 * something a person can act on.
 *
 * The reading is delegated: a Supabase RPC error is a plain object, not an
 * `Error`, and the version of this that tried to handle it here rendered
 * `[object Object]` in the confirmation dialog. `rpcErrorMessage` also decides
 * what may be shown — an unmapped Postgres fault is a bug in us, and the client
 * gets a sentence they can act on while the SQLSTATE goes to the console.
 */
export function quotationActionError(error: unknown): string {
  return rpcErrorMessage(error, QUOTATION_ACTION_ERRORS);
}

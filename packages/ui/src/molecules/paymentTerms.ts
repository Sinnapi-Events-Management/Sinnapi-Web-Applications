/**
 * The payment rail as a term of the deal — the client proposes one, the vendor
 * answers it. Pure (no React/MUI), shared by all three portals for the same
 * reason `bookingTransitions` is: this is one conversation between two people,
 * and a client told "your vendor is deciding" while the vendor is told "nothing
 * to do" is two screens disagreeing about one row.
 *
 * The vocabulary is the database's. `payment_type` has carried `'direct'` and
 * `'escrow'` since the first migration; what the product *calls* `direct` is
 * "off platform", and that translation happens here, once, rather than in each
 * portal's JSX.
 *
 * WHAT MAKES THIS WORTH A MODULE
 * The difference between the two rails is not a label, it is a list of
 * consequences — who holds the money, who can be made whole, and what it costs.
 * Those sentences are shown at four separate moments (choosing, waiting,
 * countering, after the fact) in three portals, and the one thing that must
 * never happen is a client reading "protected by Sinnapi" on a booking Sinnapi
 * is not holding. So the copy is data, written once.
 */

import { formatAmount, formatRate } from './money';
import { rpcErrorMessage } from './rpcError';

/** `bookings.payment_type` — the two rails a booking can be settled on. */
export type PaymentRail = 'escrow' | 'direct';

/**
 * Escrow first, deliberately. It is the protected rail and the one the platform
 * exists to provide; presenting the unprotected option first would make the
 * safer choice look like the afterthought.
 */
export const PAYMENT_RAILS: readonly PaymentRail[] = ['escrow', 'direct'];

export function isPaymentRail(value: string | null | undefined): value is PaymentRail {
  return value === 'escrow' || value === 'direct';
}

export type PaymentRailSpec = {
  rail: PaymentRail;
  /** The name the client picks by. Never the database's word. */
  label: string;
  /**
   * The same rail named from the other side of the deal. "Pay through Sinnapi"
   * is a sentence about the client's action; the vendor is choosing how they
   * are *paid*, and reading their own screen in the client's voice is how a
   * vendor picks the wrong one.
   */
  vendorLabel: string;
  /** One line under the label, in the picker. */
  tagline: string;
  /** What this rail gives the client. */
  benefits: readonly string[];
  /**
   * What it costs them, in money or in protection. Never empty — a rail with
   * nothing in this list is one the UI would present as free of trade-offs,
   * and neither of these is.
   */
  caveats: readonly string[];
  /** Whether Sinnapi charges anything at all on this rail. */
  hasFees: boolean;
  /**
   * What the rail means for the vendor, in one line. Their trade-off is the
   * mirror of the client's and is not derivable from it: the fee the client
   * pays is not deducted from the vendor, and what the vendor gives up on the
   * off-platform rail is the guarantee of being paid at all.
   */
  vendorNote: string;
  /** How a chip or a card border should read. */
  tone: 'secondary' | 'default';
};

const SPECS: Record<PaymentRail, PaymentRailSpec> = {
  escrow: {
    rail: 'escrow',
    label: 'Pay through Sinnapi',
    vendorLabel: 'Be paid through Sinnapi',
    tagline: 'We hold your money until the job is done',
    benefits: [
      'Your money is held by Sinnapi, not sent to the vendor',
      'The balance is only released when you confirm the service was delivered',
      'If something goes wrong, our team can mediate and refund you',
    ],
    caveats: [
      'Costs more than the price you agreed — a Sinnapi service fee and your ' +
        'payment provider’s processing fee are added on top',
      'An agreed share may be released to the vendor before the event',
    ],
    hasFees: true,
    vendorNote:
      'You receive the full amount agreed — Sinnapi’s fee is added on top and paid by the ' +
      'client. The agreed advance reaches you before the event; the balance once the client ' +
      'confirms delivery.',
    tone: 'secondary',
  },
  direct: {
    rail: 'direct',
    label: 'Pay the vendor directly',
    vendorLabel: 'Be paid directly by the client',
    tagline: 'Off platform — you settle it between yourselves',
    benefits: [
      'You pay exactly the amount you agreed — Sinnapi charges you nothing',
      'You and the vendor arrange the method and the timing yourselves',
    ],
    caveats: [
      'Sinnapi holds none of this money and cannot refund it',
      'If the vendor does not deliver, or you are unhappy, we cannot mediate or ' +
        'recover what you paid',
      'The booking is still recorded here, but the payment is not',
    ],
    hasFees: false,
    vendorNote:
      'You collect from the client yourself and Sinnapi takes no fee. Nothing is held for you, ' +
      'so if the client does not pay we cannot recover it, and the booking cannot be started or ' +
      'settled through the platform.',
    tone: 'default',
  },
};

export function paymentRailSpec(rail: PaymentRail): PaymentRailSpec {
  return SPECS[rail];
}

/** The rail's name in the voice of whoever is reading it. */
export function railLabelFor(rail: PaymentRail, actor: PaymentTermsActor): string {
  return actor === 'vendor' ? SPECS[rail].vendorLabel : SPECS[rail].label;
}

/**
 * A stored `payment_type` as its product name. Null renders as "Not set" rather
 * than an em dash: on a booking, "we do not yet know how this is being paid" is
 * a real state worth naming, not a missing field.
 */
export function paymentRailLabel(rail: string | null | undefined): string {
  return isPaymentRail(rail) ? SPECS[rail].label : 'Not set';
}

/** The other rail. Used wherever a counter-proposal is offered. */
export function oppositeRail(rail: PaymentRail): PaymentRail {
  return rail === 'escrow' ? 'direct' : 'escrow';
}

// ---------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------

/**
 * What `payment_terms_preview` returns — both rails priced for one amount.
 *
 * The processing fee is a range because the provider is not chosen until
 * checkout and each charges a different percentage. Collapsing it to one number
 * here would put a figure on screen that the client is then charged something
 * else for, which is the specific surprise this whole feature exists to remove.
 */
export type PaymentTermsPreview = {
  agreed_amount: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  psp_fee_rate_min: number;
  psp_fee_rate_max: number;
  psp_fee_min: number;
  psp_fee_max: number;
  escrow_total_min: number;
  escrow_total_max: number;
  direct_total: number;
  advance_rate: number;
  advance_amount: number;
  balance_amount: number;
  /** The most the client may release early — the vendor's proposal, capped. */
  advance_rate_limit: number;
};

/**
 * The headline figure for a rail: one number where the rail has one, a range
 * where it does not.
 *
 * `isRange` is returned rather than left to the caller comparing min and max,
 * because the two collapse whenever every configured provider happens to charge
 * the same percentage — and a preview that silently stops calling itself an
 * estimate on that day is one that starts lying the moment an admin adds a
 * cheaper provider.
 */
export type RailTotal = {
  min: number;
  max: number;
  isRange: boolean;
  /** Formatted for display: `UGX 226,600` or `UGX 226,600 – UGX 228,100`. */
  display: string;
};

export function railTotal(preview: PaymentTermsPreview | null, rail: PaymentRail): RailTotal {
  if (!preview) return { min: 0, max: 0, isRange: false, display: '—' };

  const currency = preview.currency;

  if (rail === 'direct') {
    const amount = preview.direct_total;
    return {
      min: amount,
      max: amount,
      isRange: false,
      display: formatAmount(amount, currency),
    };
  }

  const { escrow_total_min: min, escrow_total_max: max } = preview;
  const isRange = max > min;

  return {
    min,
    max,
    isRange,
    display: isRange
      ? `${formatAmount(min, currency)} – ${formatAmount(max, currency)}`
      : formatAmount(min, currency),
  };
}

/**
 * The processing fee as one phrase — `3%`, or `3% – 4.4%` when the rails
 * disagree. Null when nothing is configured, so a caller can drop the line
 * rather than print `0%` next to the word "fee".
 */
export function pspFeeRangeLabel(preview: PaymentTermsPreview | null): string | null {
  if (!preview) return null;
  const { psp_fee_rate_min: lo, psp_fee_rate_max: hi } = preview;
  if (!lo && !hi) return null;
  return hi > lo ? `${formatRate(lo)} – ${formatRate(hi)}` : formatRate(lo);
}

/**
 * What the client pays on top of the agreed price, as a sentence for a picker
 * card. Null on the rail that adds nothing — the absence of a fee line is a
 * stronger statement than a line reading "no fees".
 *
 * Quoted at the *top* of the range wherever the fee is uncertain. Every figure
 * in this feature that could be either bound is the higher one, so the client's
 * only surprise at checkout is a pleasant one. Quoting the floor and appending
 * "or more" is the same information arranged to flatter us.
 */
export function extraCostSummary(
  preview: PaymentTermsPreview | null,
  rail: PaymentRail,
): string | null {
  if (!preview || rail === 'direct') return null;
  const total = railTotal(preview, rail);
  const extra = total.max - preview.agreed_amount;
  if (extra <= 0) return null;

  const prefix = total.isRange ? 'Up to ' : '';
  return `${prefix}${formatAmount(extra, preview.currency)} on top of the agreed price`;
}

// ---------------------------------------------------------------------
// The conversation
// ---------------------------------------------------------------------

/** `bookings.payment_terms_status`. */
export type PaymentTermsStatus = 'proposed' | 'accepted' | 'declined' | 'countered';

/** The columns any portal needs to read to know where the terms have got to. */
export type PaymentTermsRow = {
  payment_type: string | null;
  payment_terms_status: string | null;
  payment_terms_counter: string | null;
  payment_terms_note: string | null;
  payment_terms_from_event: boolean | null;
  /** The booking's own status — a settled booking has no live terms question. */
  status: string | null;
};

export type PaymentTermsActor = 'client' | 'vendor';

/**
 * Where the terms have got to, phrased for whoever is looking.
 *
 * One function rather than a boolean per portal because the same four states
 * read differently from each side — "waiting for the vendor" and "waiting for
 * you" are the same row — and splitting that across two codebases is how the
 * two sides end up describing different situations.
 */
export type PaymentTermsView = {
  status: PaymentTermsStatus;
  /** The rail on the table right now: the counter if one is pending. */
  rail: PaymentRail | null;
  /** The rail originally proposed by the client. */
  proposed: PaymentRail | null;
  /** The vendor's counter, while one is outstanding. */
  counter: PaymentRail | null;
  /** Whatever the last party to answer said about it. */
  note: string | null;
  /** Set on the event, so not this booking's to renegotiate. */
  fromEvent: boolean;
  /** One line naming the state, for a card header or a chip. */
  headline: string;
  /** What happens next, addressed to `actor`. */
  detail: string;
  /** The vendor is being asked to accept, decline or counter. */
  awaitingVendor: boolean;
  /** The client is being asked to accept or decline a counter. */
  awaitingClient: boolean;
  /** Whether this actor has a decision to make right now. */
  isWaitingOnMe: boolean;
  /**
   * Whether the vendor may offer the other rail. False on event-bound terms:
   * the client set them across every booking under that event, so one vendor
   * negotiating them alone would break the thing the event setting is for.
   */
  canCounter: boolean;
};

function railOrNull(value: string | null | undefined): PaymentRail | null {
  return isPaymentRail(value) ? value : null;
}

export function readPaymentTerms(row: PaymentTermsRow, actor: PaymentTermsActor): PaymentTermsView {
  const status = (row.payment_terms_status ?? 'proposed') as PaymentTermsStatus;
  const proposed = railOrNull(row.payment_type);
  const counter = railOrNull(row.payment_terms_counter);
  const fromEvent = !!row.payment_terms_from_event;
  const note = row.payment_terms_note?.trim() || null;

  // A booking that is no longer live has no open question, whatever the terms
  // column still says. `requested` is the only status where either party is
  // being asked anything.
  const isPending = row.status === 'requested';

  const awaitingVendor = isPending && status === 'proposed';
  const awaitingClient = isPending && status === 'countered';

  const rail = status === 'countered' ? counter : proposed;

  return {
    status,
    rail,
    proposed,
    counter,
    note,
    fromEvent,
    ...describe({ status, proposed, counter, actor, awaitingVendor, awaitingClient }),
    awaitingVendor,
    awaitingClient,
    isWaitingOnMe: actor === 'vendor' ? awaitingVendor : awaitingClient,
    canCounter: awaitingVendor && !fromEvent,
  };
}

/**
 * The two sentences. Split out so `readPaymentTerms` stays a shape and this
 * stays copy — the part most likely to be edited by someone who is not reading
 * the rest of the file.
 */
function describe(input: {
  status: PaymentTermsStatus;
  proposed: PaymentRail | null;
  counter: PaymentRail | null;
  actor: PaymentTermsActor;
  awaitingVendor: boolean;
  awaitingClient: boolean;
}): { headline: string; detail: string } {
  const { status, proposed, counter, actor, awaitingVendor, awaitingClient } = input;
  const isVendor = actor === 'vendor';

  // Whose action the sentence describes decides which label it takes, not who
  // is reading it. "The client has asked to be paid through Sinnapi" is the
  // wrong sentence on a vendor's screen for the same reason "you proposed to
  // pay the vendor directly" is: both put one party's words in the other's
  // mouth. So the voice follows the subject of the clause.
  const clientVoice = proposed ? SPECS[proposed].label.toLowerCase() : 'no terms';
  const counterAsVendor = counter ? SPECS[counter].vendorLabel.toLowerCase() : 'other terms';
  const counterAsClient = counter ? SPECS[counter].label.toLowerCase() : 'other terms';

  if (awaitingVendor) {
    return {
      headline: isVendor ? 'The client is waiting on you' : 'Waiting for your vendor',
      detail: isVendor
        ? `The client has asked to ${clientVoice}. Accept the booking on these terms, propose ` +
          'the other way of paying, or decline the request.'
        : `You asked to ${clientVoice}. Your vendor will accept, propose paying another way, ` +
          'or decline.',
    };
  }

  if (awaitingClient) {
    return {
      headline: isVendor ? 'Waiting for the client' : 'Your vendor proposed different terms',
      detail: isVendor
        ? `You asked to ${counterAsVendor} instead. The client will accept or decline — the date ` +
          'is not held until they do.'
        : `Your vendor would rather you ${counterAsClient}. Review what that means and accept ` +
          'or decline. Your date is not held until you answer.',
    };
  }

  if (status === 'accepted') {
    return {
      headline: 'Payment terms agreed',
      detail:
        proposed === 'escrow'
          ? 'Both of you agreed to settle this through Sinnapi escrow. The money is held by ' +
            'Sinnapi and released to the vendor on the schedule below.'
          : 'Both of you agreed to settle this directly, outside Sinnapi. Sinnapi holds none of ' +
            'this money and cannot mediate it.',
    };
  }

  if (status === 'declined') {
    return {
      headline: 'Payment terms not agreed',
      detail: isVendor
        ? 'This booking ended without terms both sides accepted.'
        : 'This booking ended without terms both sides accepted. You can send a fresh request ' +
          'with different terms.',
    };
  }

  return {
    headline: 'Payment terms',
    detail: 'No answer is outstanding on this booking.',
  };
}

// ---------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------

/** `respond_booking`, `respond_terms_counter` and `set_event_payment_terms`. */
const PAYMENT_TERMS_ERRORS: Record<string, string> = {
  booking_not_pending:
    'This booking has already been answered. Reload the page to see where it got to.',
  terms_set_by_event:
    'These terms are set on the event this booking belongs to, so they cannot be changed here. ' +
    'You can accept the booking or decline it.',
  terms_already_countered:
    'You have already proposed different terms on this booking. The client is deciding.',
  counter_same_as_proposed:
    'That is the way of paying the client already asked for — accept the booking instead.',
  counter_required: 'Choose the way of paying you would rather use.',
  no_counter_pending: 'There are no proposed terms waiting for your answer on this booking.',
  reason_required: 'Add a short reason so the other party knows why.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  advance_terms_not_accepted:
    'Agree to the advance schedule before accepting these terms — it decides how much reaches ' +
    'your vendor before the event.',
  advance_rate_out_of_range: 'That advance is outside the range your vendor allows.',
  not_an_escrow_booking:
    'This booking was agreed to be paid directly, outside Sinnapi, so it cannot be funded here.',
  payment_terms_not_agreed:
    'Your vendor has not agreed the payment terms yet, so there is nothing to pay into.',
  unsupported_action: 'That is not something you can do to this booking.',
  event_not_found: 'That event no longer exists, or it is not yours.',
  note_too_long: 'That note is too long — keep it under 500 characters.',
  not_found: 'This booking no longer exists.',
  forbidden: 'You do not have permission to answer these terms.',
};

/** A failed terms write as a sentence the person can act on. */
export function paymentTermsError(error: unknown): string {
  return rpcErrorMessage(error, PAYMENT_TERMS_ERRORS);
}

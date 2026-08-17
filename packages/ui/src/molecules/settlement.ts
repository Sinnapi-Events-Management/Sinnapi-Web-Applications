/**
 * The post-event settlement, as data. Pure (no React/MUI), shared by all three
 * portals — same reason `bookingTransitions` lives beside it.
 *
 * One negotiation is read by three different people at once: the vendor who
 * asked to be paid, the client being asked to approve it, and the admin
 * holding the money in between. Each of them needs the same four answers —
 * where has this got to, whose turn is it, how much is actually being paid,
 * and what happens if nobody moves — and each needs them phrased for their own
 * side.
 *
 * Writing that once here rather than three times in three cards is not only
 * about duplication. A "waiting on you" badge in the vendor portal and a
 * "waiting on the vendor" line in the client portal that disagree by a state
 * is how two people end up each believing the other has the ball, and this is
 * a flow where the cost of that is a payout stalling for a day.
 *
 * The server is the enforcement. Everything here decides what to show and what
 * to offer; `settlement_requests` and its RPCs decide what is true.
 */

import { rpcErrorMessage } from './rpcError';

/** Mirrors `settlement_request_status`. */
export const SETTLEMENT_STATUSES = [
  'vendor_requested',
  'admin_forwarded',
  'awaiting_vendor_consent',
  'consented',
  'released',
  'contested',
  'cancelled',
] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

/** Who is looking at the request. Drives every sentence below. */
export type SettlementViewer = 'vendor' | 'client' | 'admin';

/**
 * The fields the UI reads off a request. Deliberately narrower than the table:
 * each portal selects what it needs and they all satisfy this shape, so the
 * shared components take one type instead of three near-identical ones.
 */
export type SettlementRequestShape = {
  id: string;
  status: string;
  currency: string | null;
  requested_amount: number | null;
  approved_amount: number | null;
  decision: string | null;
  decision_reason: string | null;
  decided_automatically?: boolean | null;
  vendor_note: string | null;
  admin_note?: string | null;
  vendor_response?: string | null;
  vendor_response_note?: string | null;
  client_due_at: string | null;
  vendor_due_at: string | null;
  admin_due_at?: string | null;
  client_consent_at?: string | null;
  vendor_consent_at?: string | null;
  released_at?: string | null;
  last_nudge_at?: string | null;
  nudge_count?: number | null;
};

/** One row of the visible trail. */
export type SettlementEventShape = {
  id: string;
  kind: string;
  actor_role: string;
  amount: number | null;
  note: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------
// Where it has got to
// ---------------------------------------------------------------------

/** Short label for a chip. Neutral wording — it is read by all three sides. */
export const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  vendor_requested: 'With Sinnapi',
  admin_forwarded: 'With the client',
  awaiting_vendor_consent: 'With the vendor',
  consented: 'Agreed — awaiting release',
  released: 'Released',
  contested: 'Contested',
  cancelled: 'Withdrawn',
};

/**
 * The four steps of the happy path, for a stepper. `contested` and `cancelled`
 * leave the path rather than sitting somewhere on it, so they return -1 and the
 * card shows its alert instead of a progress rail.
 */
export const SETTLEMENT_STEPS = ['Requested', 'With the client', 'Agreed', 'Released'] as const;

export function settlementStep(status: string): number {
  switch (status) {
    case 'vendor_requested':
      return 0;
    case 'admin_forwarded':
    case 'awaiting_vendor_consent':
      return 1;
    case 'consented':
      return 2;
    case 'released':
      return 3;
    default:
      return -1;
  }
}

export function isSettlementOpen(status: string): boolean {
  return ['vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent', 'consented'].includes(
    status,
  );
}

export function isSettlementSettled(status: string): boolean {
  return ['released', 'contested', 'cancelled'].includes(status);
}

// ---------------------------------------------------------------------
// Whose turn it is
// ---------------------------------------------------------------------

export type SettlementTurn = {
  /** The side the request is waiting on. `null` once nothing is pending. */
  party: SettlementViewer | null;
  /** When that side runs out of time, ISO, or `null` when no clock applies. */
  dueAt: string | null;
  /** "Waiting on you" / "Waiting on the client", written for the viewer. */
  label: string;
  /** True when the viewer is the one being waited on. */
  isYours: boolean;
};

const TURN_BY_STATUS: Record<string, SettlementViewer> = {
  vendor_requested: 'admin',
  admin_forwarded: 'client',
  awaiting_vendor_consent: 'vendor',
  consented: 'admin',
};

const PARTY_NOUN: Record<SettlementViewer, string> = {
  vendor: 'the vendor',
  client: 'the client',
  admin: 'our team',
};

/**
 * Who the request is waiting on, and what to call them.
 *
 * The same rule the server uses to route a nudge (`nudge_settlement`), so the
 * badge on the page and the reminder that arrives can never name different
 * people.
 */
export function settlementTurn(
  request: SettlementRequestShape,
  viewer: SettlementViewer,
): SettlementTurn {
  const party = TURN_BY_STATUS[request.status] ?? null;

  if (!party) {
    return {
      party: null,
      dueAt: null,
      label: SETTLEMENT_STATUS_LABEL[request.status] ?? '',
      isYours: false,
    };
  }

  const dueAt =
    party === 'client'
      ? request.client_due_at
      : party === 'vendor'
        ? request.vendor_due_at
        : (request.admin_due_at ?? null);

  const isYours = party === viewer;
  return {
    party,
    dueAt,
    label: isYours ? 'Waiting on you' : `Waiting on ${PARTY_NOUN[party]}`,
    isYours,
  };
}

// ---------------------------------------------------------------------
// The money
// ---------------------------------------------------------------------

export type SettlementAmounts = {
  requested: number;
  /** What was agreed, or `null` while nobody has decided yet. */
  approved: number | null;
  /** requested - approved, and 0 while undecided. */
  withheld: number;
  /** A decision exists and it is for less than was asked. */
  isReduced: boolean;
  /** Every party who has to consent has done so. */
  isAgreed: boolean;
  currency: string;
};

export function settlementAmounts(request: SettlementRequestShape): SettlementAmounts {
  const requested = Number(request.requested_amount ?? 0);
  const approved = request.approved_amount == null ? null : Number(request.approved_amount);
  const withheld = approved == null ? 0 : Math.max(requested - approved, 0);

  return {
    requested,
    approved,
    withheld,
    isReduced: approved != null && approved < requested,
    isAgreed: ['consented', 'released'].includes(request.status),
    currency: request.currency ?? 'UGX',
  };
}

/**
 * The one sentence that has to be right.
 *
 * Whatever figure is finally paid, all three parties are shown it in the same
 * words at the same time — that is what makes the agreement an agreement
 * rather than three people with three impressions. The wording differs per
 * audience only in who is being paid and who is being refunded; the numbers
 * never do.
 */
export function settlementHeadline(
  request: SettlementRequestShape,
  viewer: SettlementViewer,
): string {
  const { status } = request;

  if (status === 'cancelled') return 'This payment request was withdrawn.';

  if (status === 'contested') {
    return viewer === 'client'
      ? 'The vendor has not accepted the amount you offered. Nothing has been paid or refunded — ' +
          'our team is reviewing both sides.'
      : viewer === 'vendor'
        ? 'You contested the amount offered. The money is frozen while our team reviews it.'
        : 'The vendor rejected the reduced amount. A dispute is open and the timers are frozen.';
  }

  if (status === 'vendor_requested') {
    return viewer === 'vendor'
      ? 'You have asked for the money held for this booking. Our team is putting it to the client.'
      : viewer === 'admin'
        ? 'The vendor is asking to be paid. Put it to the client to approve.'
        : 'The vendor has asked to be paid for this booking.';
  }

  if (status === 'admin_forwarded') {
    return viewer === 'client'
      ? 'Your vendor has asked to be paid. Approve the full amount, or approve less and tell them why.'
      : viewer === 'vendor'
        ? 'The client has been asked to approve your payment.'
        : 'The client has been asked to approve this payment.';
  }

  if (status === 'awaiting_vendor_consent') {
    return viewer === 'vendor'
      ? 'The client has offered less than you asked for. Nothing is paid or refunded until you ' +
          'accept it or contest it.'
      : viewer === 'client'
        ? 'Your offer is with the vendor. They have to agree to it before anything moves.'
        : 'A reduced amount is with the vendor for consent. Do not release until they agree.';
  }

  // consented / released — the figure everybody signed off on.
  const wasReduced = settlementAmounts(request).isReduced;
  if (viewer === 'vendor') {
    return wasReduced
      ? 'You accepted a reduced amount. This is the figure being paid to you.'
      : 'The full amount was approved. This is the figure being paid to you.';
  }
  if (viewer === 'client') {
    return wasReduced
      ? 'Both of you agreed this figure. The vendor is paid it and the difference comes back to you.'
      : 'You approved the full amount. It is on its way to the vendor.';
  }
  return wasReduced
    ? 'Both parties consented to this figure. Pay the vendor and return the difference to the client.'
    : 'Both parties consented to the full amount. Release it.';
}

/**
 * How this figure came to be agreed, in one line, for the consent record shown
 * on every side. An automatic full approval is called what it is — nobody
 * pretends the client said yes when the client said nothing.
 */
export function settlementConsentNote(request: SettlementRequestShape): string | null {
  if (!['consented', 'released'].includes(request.status)) return null;

  if (request.decided_automatically) {
    return (
      'The client did not respond within the window they were given, so this was recorded as a ' +
      'full approval and reviewed by our team before release.'
    );
  }
  if (settlementAmounts(request).isReduced) {
    return 'Agreed by the client and accepted by the vendor. Both consents are on record.';
  }
  return 'Approved in full by the client.';
}

// ---------------------------------------------------------------------
// What each party may do right now
// ---------------------------------------------------------------------

/**
 * Whether the vendor may raise a request at all.
 *
 * Mirrors `request_settlement`: the booking must be completed (which is itself
 * gated on the event having ended), the escrow must be funded, unfrozen, and
 * still holding something, and there must be no live request already.
 */
export function canRequestSettlement(input: {
  bookingStatus: string;
  escrowStatus: string | null;
  isFrozen: boolean;
  hasOpenRequest: boolean;
}): { allowed: boolean; blockedReason: string | null } {
  const { bookingStatus, escrowStatus, isFrozen, hasOpenRequest } = input;

  if (hasOpenRequest) return { allowed: false, blockedReason: null };
  if (bookingStatus !== 'completed') {
    return {
      allowed: false,
      blockedReason:
        'Mark the booking completed once the event has ended — that is what lets you ask for the ' +
        'money being held for you.',
    };
  }
  if (!escrowStatus) {
    return {
      allowed: false,
      blockedReason:
        'Nothing was funded through Sinnapi on this booking, so there is nothing for ' +
        'us to release.',
    };
  }
  if (isFrozen) {
    return {
      allowed: false,
      blockedReason: 'The money on this booking is frozen while an issue is reviewed.',
    };
  }
  // Already on its way out. The client can confirm the release straight from
  // their own payment card, which skips this conversation entirely — a vendor
  // who then sees "nothing is being held for you" would reasonably read that
  // as their money having gone missing.
  if (['release_requested', 'payout_approved'].includes(escrowStatus)) {
    return {
      allowed: false,
      blockedReason:
        'The client has already approved this payment. It is with our finance team to release — ' +
        'there is nothing you need to do.',
    };
  }
  if (escrowStatus === 'paid_out') {
    return { allowed: false, blockedReason: 'This booking has already been paid out in full.' };
  }
  if (!['held', 'advance_released'].includes(escrowStatus)) {
    return {
      allowed: false,
      blockedReason: 'There is nothing left being held for you on this booking.',
    };
  }
  return { allowed: true, blockedReason: null };
}

export function canDecideSettlement(request: SettlementRequestShape): boolean {
  return request.status === 'admin_forwarded';
}

export function canRespondToSettlement(request: SettlementRequestShape): boolean {
  return request.status === 'awaiting_vendor_consent';
}

export function canForwardSettlement(request: SettlementRequestShape): boolean {
  return request.status === 'vendor_requested';
}

export function canReleaseSettlement(request: SettlementRequestShape): boolean {
  return request.status === 'consented';
}

/**
 * Whether a manual reminder is available, and when it next will be.
 *
 * The cooldown is per request rather than per sender, matching the server:
 * two people chasing from the same side an hour apart is still two
 * interruptions for the person being chased.
 */
export function canNudgeSettlement(
  request: SettlementRequestShape,
  cooldownMinutes = 60,
  now: number = Date.now(),
): { allowed: boolean; nextAt: number | null } {
  if (!isSettlementOpen(request.status)) return { allowed: false, nextAt: null };
  if (!request.last_nudge_at) return { allowed: true, nextAt: null };

  const nextAt = new Date(request.last_nudge_at).getTime() + cooldownMinutes * 60_000;
  return { allowed: now >= nextAt, nextAt };
}

// ---------------------------------------------------------------------
// Clocks
// ---------------------------------------------------------------------

/**
 * A deadline as "4h 12m left", or how far past it we are.
 *
 * Deliberately coarse below a minute — a payout deadline ticking by the second
 * reads as a countdown to something being taken away, which is the wrong
 * feeling for a screen asking someone to make a considered decision about
 * money.
 */
export function formatTimeLeft(
  dueAt: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return null;

  const diff = due - now;
  const overdue = diff < 0;
  const mins = Math.floor(Math.abs(diff) / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  const amount =
    days >= 1
      ? `${days}d ${hours % 24}h`
      : hours >= 1
        ? `${hours}h ${mins % 60}m`
        : mins >= 1
          ? `${mins}m`
          : 'less than a minute';

  return overdue ? `${amount} overdue` : `${amount} left`;
}

export function isSettlementOverdue(
  request: SettlementRequestShape,
  viewer: SettlementViewer,
  now: number = Date.now(),
): boolean {
  const { dueAt } = settlementTurn(request, viewer);
  return !!dueAt && new Date(dueAt).getTime() < now;
}

// ---------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------

/** What each `raise exception` token in the settlement RPCs means to a person. */
const SETTLEMENT_ERRORS: Record<string, string> = {
  booking_not_completed:
    'Mark the booking completed first. That is what tells everyone the event happened.',
  booking_not_ended: 'The event has not ended yet, so this booking cannot be completed or settled.',
  escrow_not_funded: 'Nothing was funded through Sinnapi on this booking.',
  escrow_not_releasable:
    'The money on this booking is not in a state we can release from. Reload to see where it got to.',
  escrow_frozen:
    'The money on this booking is frozen while an issue is reviewed. Nothing can be released until that is resolved.',
  settlement_already_open:
    'There is already a live request on this booking. Reload the page to see where it got to.',
  settlement_pending:
    'This booking has a settlement the parties agreed at a lower figure. Release it from the booking, not from here — approving it here would overpay the vendor.',
  nothing_to_settle: 'There is nothing left being held for you on this booking.',
  consent_required: 'Tick the box to confirm you agree to this amount before submitting.',
  reduction_required: 'A reduced amount has to be less than what the vendor asked for.',
  amount_required: 'Enter the amount you are approving.',
  invalid_amount: 'That is not an amount we can approve.',
  reason_required: 'A reason is required — the other party has to be able to answer it.',
  reason_too_long: 'That reason is too long — keep it under 1000 characters.',
  unsupported_decision: 'That is not a decision that can be made here.',
  unsupported_response: 'That is not a response that can be given here.',
  nudge_too_soon: 'You have already sent a reminder recently. Give them a little longer to reply.',
  invalid_state:
    'This request has moved on since the page was loaded. Reload it to see where it got to.',
  not_found: 'This request no longer exists.',
  forbidden: 'You do not have permission to act on this request.',
};

/** A failed settlement write as something the person can act on. */
export function settlementError(error: unknown): string {
  return rpcErrorMessage(error, SETTLEMENT_ERRORS);
}

/**
 * The deadline a client has to fund an escrow booking, as a rule rather than as
 * three portals' worth of date arithmetic.
 *
 * Pure (no React, no MUI), shared for the same reason `bookingTransitions` and
 * `paymentTerms` are: this is one clock, running on one booking, watched by
 * three people who must not be told different things about it. A vendor offered
 * a Cancel button while the client's own page still says "you have 4 hours" is
 * not a cosmetic inconsistency — it is the platform taking a side in an
 * argument it created.
 *
 * WHAT THE SERVER OWNS AND WHAT THIS DOES
 * The server owns everything that matters: it computes the deadline, stamps the
 * overdue flag, and refuses every write this module would decline to offer.
 * This exists so a page can decline to *offer* a button the server would reject
 * and say why — and so the countdown on the client's screen is the same
 * countdown on the vendor's.
 *
 * THE ONE ASYMMETRY, ON PURPOSE
 * A passed deadline is not enough to offer a cancellation. The server also
 * requires the booking to have been *flagged* overdue by the sweep, and this
 * module mirrors that: `isPastDue` is a fact about the clock, `isOverdue` is a
 * fact about the platform having noticed and told everybody. Only the second
 * one opens the Cancel button. The gap between them is a few minutes of cron
 * latency, and it is the window in which a client's payment may still be in
 * flight — offering to cancel inside it is how a paid booking gets cancelled.
 */

import { rpcErrorMessage } from './rpcError';

/**
 * Where a booking's payment stands.
 *
 * `not_applicable` covers every booking this clock has nothing to say about:
 * off-platform bookings, requests no vendor has confirmed, and anything whose
 * terms are still being negotiated. It is a distinct state rather than a null
 * so a caller cannot accidentally render "overdue" for a booking that never had
 * a deadline in the first place.
 */
export type PaymentWindowState =
  | 'not_applicable'
  | 'awaiting'
  | 'due_soon'
  | 'past_due'
  | 'overdue'
  | 'paid'
  | 'cancelled';

/** Below this many milliseconds remaining, the deadline stops being background. */
const DUE_SOON_MS = 6 * 3_600_000;

export type PaymentWindowInput = {
  /** `bookings.status`. */
  status: string | null | undefined;
  /** `bookings.payment_type`. */
  paymentType: string | null | undefined;
  /** `bookings.payment_terms_status`. */
  paymentTermsStatus?: string | null;
  /** `bookings.payment_due_at` — the originally computed deadline. */
  paymentDueAt: string | null | undefined;
  /** `bookings.payment_due_override_at` — an admin's extension, when granted. */
  paymentDueOverrideAt?: string | null;
  /** `bookings.payment_overdue_at` — stamped by the sweep, not by a comparison. */
  paymentOverdueAt?: string | null;
  /** `bookings.payment_settled_at` — non-null once the escrow funded. */
  paymentSettledAt?: string | null;
  /**
   * `escrow_transactions.status`, when one exists. Read as a second opinion on
   * whether the money is in: `payment_settled_at` and the escrow row are
   * written by different paths, and a page that trusts only one of them will
   * chase a client whose payment landed thirty seconds ago.
   */
  escrowStatus?: string | null;
  /** Now, in epoch milliseconds. Passed in so the rule stays pure. */
  now?: number;
};

export type PaymentWindow = {
  state: PaymentWindowState;
  /** The deadline in force — the override when there is one. Epoch ms. */
  dueAt: number | null;
  /** Milliseconds left. Negative once the deadline has passed, null when none. */
  msRemaining: number | null;
  /** The clock has run out. Says nothing about whether anyone has noticed. */
  isPastDue: boolean;
  /** The sweep flagged it and told all three parties. This is what gates cancelling. */
  isOverdue: boolean;
  /** Whether an admin moved this deadline. */
  isExtended: boolean;
  /** The client may still fund it — true right up until it is cancelled. */
  canPay: boolean;
  /** A vendor or admin may send a reminder. */
  canNudge: boolean;
  /** A vendor or admin may cancel it. Requires the flag, not just the clock. */
  canCancel: boolean;
};

/**
 * Whether the money is in, by either of the two records that would know.
 *
 * `held`, `awaiting_advance` and everything downstream of them mean funded.
 * `initiated` and `failed` do not: the first is a checkout somebody opened and
 * walked away from, the second is a charge that bounced. Both are states in
 * which the booking is still unpaid and still worth chasing.
 */
function isFunded(input: PaymentWindowInput): boolean {
  if (input.paymentSettledAt) return true;
  const s = input.escrowStatus;
  return !!s && s !== 'initiated' && s !== 'failed';
}

export function evaluatePaymentWindow(input: PaymentWindowInput): PaymentWindow {
  const { status, paymentType, paymentDueAt, paymentDueOverrideAt, now = Date.now() } = input;

  const none: PaymentWindow = {
    state: 'not_applicable',
    dueAt: null,
    msRemaining: null,
    isPastDue: false,
    isOverdue: false,
    isExtended: false,
    canPay: false,
    canNudge: false,
    canCancel: false,
  };

  // Off-platform bookings are settled between the two parties. Sinnapi cannot
  // see that payment, so it has no standing to put a clock on it — let alone to
  // cancel a booking over money it would never have been told about.
  if (paymentType !== 'escrow') return none;

  if (status === 'cancelled' || status === 'declined') {
    return { ...none, state: 'cancelled' };
  }

  if (isFunded(input)) return { ...none, state: 'paid' };

  // Nothing to pay against until the vendor has taken the job.
  if (status !== 'confirmed') return none;

  const raw = paymentDueOverrideAt ?? paymentDueAt;
  if (!raw) return none;

  const dueAt = new Date(raw).getTime();
  if (Number.isNaN(dueAt)) return none;

  const msRemaining = dueAt - now;
  const isPastDue = msRemaining <= 0;
  const isOverdue = !!input.paymentOverdueAt;
  const isExtended = !!paymentDueOverrideAt;

  const state: PaymentWindowState = isOverdue
    ? 'overdue'
    : isPastDue
      ? 'past_due'
      : msRemaining <= DUE_SOON_MS
        ? 'due_soon'
        : 'awaiting';

  return {
    state,
    dueAt,
    msRemaining,
    isPastDue,
    isOverdue,
    isExtended,
    // The offer to pay stands until the booking is actually cancelled. A client
    // who missed the deadline by an hour and wants to pay should be allowed to
    // — the deadline exists to free the vendor's date, not to punish lateness,
    // and the vendor has not chosen to release it yet.
    canPay: true,
    canNudge: true,
    // See the module header: the flag, not the clock. The minutes between a
    // deadline passing and the sweep noticing are exactly the minutes in which
    // a payment may still be settling.
    canCancel: isOverdue,
  };
}

/**
 * The payment-window columns exactly as they arrive from `bookings`.
 *
 * Declared once here so the three portals' `types.ts` can spread it rather than
 * each maintaining their own copy of eight nullable timestamps — which is eight
 * chances per portal to typo a column name into a permanently-null field that
 * fails silently as "this booking has no deadline".
 */
export type BookingPaymentWindowFields = {
  payment_window_opened_at: string | null;
  payment_due_at: string | null;
  payment_due_override_at: string | null;
  payment_due_override_reason: string | null;
  payment_overdue_at: string | null;
  payment_settled_at: string | null;
  last_payment_nudge_at: string | null;
  payment_nudge_count: number | null;
};

/** The select list for those columns, for a PostgREST `.select()`. */
export const BOOKING_PAYMENT_WINDOW_COLUMNS = [
  'payment_window_opened_at',
  'payment_due_at',
  'payment_due_override_at',
  'payment_due_override_reason',
  'payment_overdue_at',
  'payment_settled_at',
  'last_payment_nudge_at',
  'payment_nudge_count',
].join(',');

/**
 * A booking row, as far as the payment window is concerned.
 *
 * Every field optional because the three portals select different subsets — a
 * table row carries less than a detail page — and a window that cannot be
 * evaluated resolves to `not_applicable`, which is the honest answer for a row
 * that did not fetch the columns.
 */
export type PaymentWindowBooking = Partial<BookingPaymentWindowFields> & {
  status?: string | null;
  payment_type?: string | null;
  payment_terms_status?: string | null;
};

/**
 * `evaluatePaymentWindow` against a booking row, without the caller restating
 * the mapping from snake_case columns to the rule's inputs.
 *
 * The mapping is the boring part and therefore the part that gets wrong: a
 * portal that passes `payment_due_at` where `payment_due_override_at` belongs
 * shows a client a deadline an admin already moved. One reader, one mapping.
 */
export function readPaymentWindow(
  booking: PaymentWindowBooking,
  options: { escrowStatus?: string | null; now?: number } = {},
): PaymentWindow {
  return evaluatePaymentWindow({
    status: booking.status,
    paymentType: booking.payment_type,
    paymentTermsStatus: booking.payment_terms_status ?? null,
    paymentDueAt: booking.payment_due_at ?? null,
    paymentDueOverrideAt: booking.payment_due_override_at ?? null,
    paymentOverdueAt: booking.payment_overdue_at ?? null,
    paymentSettledAt: booking.payment_settled_at ?? null,
    escrowStatus: options.escrowStatus ?? null,
    now: options.now,
  });
}

/**
 * How long is left, in the largest unit that still says something useful.
 *
 * Deliberately coarse. A deadline two days out is "2 days", not "1 day 22
 * hours" — the extra precision is noise at that distance, and it only becomes
 * information in the last few hours, which is where minutes appear.
 */
export function formatTimeRemaining(ms: number | null): string {
  if (ms == null) return '—';
  const abs = Math.abs(ms);

  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor(abs / 60_000);

  if (days >= 2) return `${days} days`;
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (minutes >= 1) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return 'less than a minute';
}

/** The countdown as a phrase, from whichever side of the deadline we are on. */
export function formatDeadlineDistance(window: PaymentWindow): string {
  if (window.msRemaining == null) return '—';
  return window.isPastDue
    ? `${formatTimeRemaining(window.msRemaining)} ago`
    : `${formatTimeRemaining(window.msRemaining)} left`;
}

export type PaymentWindowAudience = 'client' | 'vendor' | 'admin';

export type PaymentWindowCopy = {
  /** Short enough for a chip. */
  label: string;
  /** One or two sentences, in this audience's voice. */
  detail: string;
  /** Drives chip colour and alert severity. */
  tone: 'info' | 'warning' | 'error' | 'success' | 'default';
};

/**
 * What this state means, said to this person.
 *
 * Data rather than JSX because the same state is rendered as a chip in a table,
 * an alert on a detail page and a line in a dialog, across three apps — and the
 * one thing that must never happen is a vendor reading the client's sentence.
 * "You have 6 hours to pay" on a vendor's screen is a bug that only a human
 * notices, which is the kind this file exists to make impossible.
 */
export function paymentWindowCopy(
  window: PaymentWindow,
  audience: PaymentWindowAudience,
): PaymentWindowCopy {
  const left = formatTimeRemaining(window.msRemaining);
  const late = formatTimeRemaining(window.msRemaining);

  switch (window.state) {
    case 'paid':
      return {
        label: 'Paid',
        tone: 'success',
        detail:
          audience === 'client'
            ? 'Your payment is in and Sinnapi is holding it.'
            : 'The client has funded this booking. Sinnapi is holding the money.',
      };

    case 'cancelled':
      return {
        label: 'Cancelled',
        tone: 'default',
        detail: 'This booking was cancelled. Nothing was charged.',
      };

    case 'awaiting':
      return {
        label: `Pay within ${left}`,
        tone: 'info',
        detail:
          audience === 'client'
            ? `Pay the full amount within ${left} to secure your date.`
            : audience === 'vendor'
              ? `The client has ${left} to pay. The date is held until then.`
              : `Client has ${left} to fund this booking.`,
      };

    case 'due_soon':
      return {
        label: `${left} left to pay`,
        tone: 'warning',
        detail:
          audience === 'client'
            ? `Only ${left} left to pay for this booking. After that your vendor may release the date.`
            : audience === 'vendor'
              ? `The client has ${left} left to pay. You will be told if the deadline passes.`
              : `Deadline in ${left}. Worth a reminder if the client has not started paying.`,
      };

    // The clock has run out but the platform has not said so yet. Nobody is
    // offered an action here on purpose — see the module header.
    case 'past_due':
      return {
        label: 'Payment due',
        tone: 'warning',
        detail:
          audience === 'client'
            ? 'Your payment deadline has just passed. Pay now to keep your date.'
            : 'The payment deadline has just passed. We are confirming whether a payment is still settling.',
      };

    case 'overdue':
      return {
        label: 'Overdue',
        tone: 'error',
        detail:
          audience === 'client'
            ? `This booking is ${late} past its payment deadline. You can still pay, but your vendor may now cancel it and release your date.`
            : audience === 'vendor'
              ? `The client did not pay and is ${late} past the deadline. Nothing has been cancelled — you can cancel and free the date, or give them longer.`
              : `${late} past deadline and unfunded. Nothing was cancelled automatically.`,
      };

    default:
      return { label: '—', tone: 'default', detail: '' };
  }
}

/* -------------------------------------------------------------------------
 * Chasing an unpaid booking.
 *
 * The three things a vendor or an admin can do about one, as data — the same
 * shape and for the same reason as `bookingTransitions`: a fourth action, or a
 * reworded consequence, is an edit here and nothing in either portal.
 * ---------------------------------------------------------------------- */

export const PAYMENT_CHASE_ACTIONS = ['nudge', 'extend', 'cancel'] as const;

export type PaymentChaseAction = (typeof PAYMENT_CHASE_ACTIONS)[number];

/** Who is chasing. Extending is an admin lever; the other two are shared. */
export type PaymentChaseViewer = 'vendor' | 'admin';

export type PaymentChaseSpec = {
  action: PaymentChaseAction;
  /** Button label on the card. */
  label: string;
  /** Dialog heading. `{ref}` is replaced with the booking reference. */
  title: string;
  /** What confirming will *cause*. Never "are you sure". */
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'secondary' | 'error' | 'success';
  /** Whether the free-text field is mandatory. */
  requiresReason: boolean;
  reasonLabel: string;
  reasonHelper: string;
  /** Only `extend` asks for a number of hours. */
  needsHours: boolean;
};

const CHASE_SPECS: Record<PaymentChaseAction, PaymentChaseSpec> = {
  nudge: {
    action: 'nudge',
    label: 'Send a reminder',
    title: 'Remind the client to pay {ref}?',
    description:
      'The client gets an email and an in-app notification telling them this booking is unpaid ' +
      'and when payment is due. Nothing about the booking changes, and the reminder is recorded ' +
      'on its record so everyone can see it was sent.',
    confirmLabel: 'Send reminder',
    tone: 'primary',
    requiresReason: false,
    reasonLabel: 'Add a note (optional)',
    reasonHelper: 'Included in the reminder the client receives.',
    needsHours: false,
  },
  extend: {
    action: 'extend',
    label: 'Give more time',
    title: 'Extend the payment deadline on {ref}?',
    description:
      'The client gets longer to pay and is told so, along with your reason. The overdue flag ' +
      'comes off, the reminder schedule restarts against the new deadline, and nobody can cancel ' +
      'the booking for non-payment until that deadline has passed too.',
    confirmLabel: 'Extend deadline',
    tone: 'secondary',
    requiresReason: true,
    reasonLabel: 'Why the extension',
    reasonHelper: 'Shown to the client and the vendor, and kept on the booking’s record.',
    needsHours: true,
  },
  cancel: {
    action: 'cancel',
    label: 'Cancel — not paid',
    title: 'Cancel unpaid booking {ref}?',
    description:
      'The booking ends and the date is released. No money was ever taken from the client, so ' +
      'there is nothing to refund — but their event loses this vendor, and the reason you give ' +
      'is the whole of what they are told. This cannot be undone; a new booking would have to be ' +
      'requested from scratch.',
    confirmLabel: 'Cancel booking',
    tone: 'error',
    requiresReason: true,
    reasonLabel: 'Reason for cancelling',
    reasonHelper: 'Shown to the client. Be specific — this is all the explanation they get.',
    needsHours: false,
  },
};

export function paymentChaseSpec(action: PaymentChaseAction): PaymentChaseSpec {
  return CHASE_SPECS[action];
}

/**
 * What this viewer can do about this booking right now, in the order they
 * should be offered: chase first, then buy time, then end it.
 *
 * Cancelling appears only once the platform has flagged the booking overdue —
 * not merely once the clock has passed. See the module header: the difference
 * is the few minutes in which a client's payment may still be settling, and a
 * button offered inside that gap is the one that cancels a paid booking.
 */
export function availablePaymentChaseActions(
  window: PaymentWindow,
  viewer: PaymentChaseViewer,
): PaymentChaseSpec[] {
  // Nothing to chase on a booking that is paid, cancelled, or has no clock.
  if (
    window.state === 'not_applicable' ||
    window.state === 'paid' ||
    window.state === 'cancelled'
  ) {
    return [];
  }

  const actions: PaymentChaseAction[] = [];
  if (window.canNudge) actions.push('nudge');
  // Extending is the admin's lever. A vendor deciding unilaterally to hold
  // their own date longer needs no permission from the platform to do it —
  // they simply do not cancel — so the control would say nothing true.
  if (viewer === 'admin') actions.push('extend');
  if (window.canCancel) actions.push('cancel');

  return actions.map((a) => CHASE_SPECS[a]);
}

/** What the chase and cancel RPCs refuse with, in plain language. */
const PAYMENT_WINDOW_ERRORS: Record<string, string> = {
  partial_payment_not_allowed:
    'This booking has to be paid in full, in one payment. Instalments are not available.',
  not_an_escrow_booking:
    'This booking is settled directly between you and the other party, so Sinnapi has no payment to chase.',
  booking_not_confirmed: 'This only applies to a booking the vendor has confirmed.',
  already_paid: 'This booking has already been paid — there is nothing to chase.',
  booking_already_paid:
    'This booking has been paid. It can no longer be cancelled for non-payment; raise it with our team instead.',
  payment_window_open:
    'The client still has time to pay. This becomes available once the deadline has passed.',
  no_payment_window: 'This booking has no payment deadline set.',
  nudge_too_soon:
    'You have just sent a reminder on this booking. Give the client a little time before sending another.',
  note_too_long: 'That message is too long — keep it under 500 characters.',
  reason_required: 'A reason is required, and it is shown to the client.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  invalid_extension: 'Enter how many extra hours to give the client.',
  extension_too_long: 'An extension cannot be longer than 30 days.',
  not_found: 'This booking no longer exists.',
  forbidden: 'You do not have permission to do this.',
};

/**
 * Turns whatever a payment-window write failed with into something a person can
 * act on. Same reader as the booking and quotation sides — see `rpcError.ts`
 * for why a Supabase failure cannot be read with `instanceof Error`.
 */
export function paymentWindowError(error: unknown): string {
  return rpcErrorMessage(error, PAYMENT_WINDOW_ERRORS);
}

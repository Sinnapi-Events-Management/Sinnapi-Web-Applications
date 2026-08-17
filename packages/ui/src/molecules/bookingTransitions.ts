/**
 * The booking lifecycle, as data. Pure (no React/MUI), shared by all three
 * portals — the same reason `statusColor` lives beside it.
 *
 * Every status write a booking can receive is described once here: which states
 * it may be reached from, who is allowed to ask for it, what it actually does,
 * and how loudly to say so. Both portals previously re-typed fragments of this
 * — a `['requested','confirmed','in_progress']` array in the vendor portal, a
 * lifecycle tuple in each booking page, a status list inside a component's JSX
 * — and the fragments had already drifted: `in_progress` appeared in all of
 * them while nothing on the server could produce it.
 *
 * The `from` sets and `actors` mirror `start_booking`, `respond_booking`,
 * `complete_booking`, `cancel_booking` and `admin_set_booking_status`
 * deliberately. The server is the enforcement; this is the UI declining to
 * offer a button the server would refuse, which is a different job and needs
 * its own copy of the rule.
 */

import { rpcErrorMessage } from './rpcError';

/** The path a booking walks when nothing goes wrong. */
export const BOOKING_LIFECYCLE = ['requested', 'confirmed', 'in_progress', 'completed'] as const;

export type BookingLifecycleStatus = (typeof BOOKING_LIFECYCLE)[number];

/** Statuses after `status` on the happy path; empty once the booking has exited it. */
export function remainingLifecycle(status: string): string[] {
  const at = BOOKING_LIFECYCLE.indexOf(status as BookingLifecycleStatus);
  return at === -1 ? [] : BOOKING_LIFECYCLE.slice(at + 1);
}

/** Terminal states — nothing follows, so no action panel is worth drawing. */
export function isBookingSettled(status: string): boolean {
  return ['completed', 'cancelled', 'declined'].includes(status);
}

/**
 * The status writes the two *parties* to a booking can make.
 *
 * Admin overrides are deliberately not in this list. They target a status
 * rather than an action, they carry a mandatory justification, and their copy
 * addresses someone acting on a booking that is not theirs — three differences
 * that would turn every entry below into a pair of branches. The console keeps
 * its own spec (`pages/bookingDetail/schema/statusActions.ts`); two specs
 * because there are two audiences, not because one drifted.
 */
export const BOOKING_ACTIONS = ['start', 'accept', 'counter', 'decline', 'complete'] as const;

export type BookingAction = (typeof BOOKING_ACTIONS)[number];

/** Which side of a booking may ask for a transition. */
export type BookingActor = 'client' | 'vendor';

export type BookingActionSpec = {
  action: BookingAction;
  /** Button label. */
  label: string;
  /** Dialog heading. `{ref}` is replaced with the booking reference. */
  title: string;
  /**
   * What actually happens — the consequence, never "are you sure". A booking
   * status change moves money and obligations, so the modal's job is to tell
   * the person what they are about to cause, not to slow them down.
   */
  description: string;
  confirmLabel: string;
  /** Drives the dialog badge and the primary button colour. */
  tone: 'primary' | 'secondary' | 'error' | 'success';
  /** Statuses the action is offered from. */
  from: readonly string[];
  /** Portals that may offer it. Admin overrides go through their own control. */
  actors: readonly BookingActor[];
  /** Whether the party must give a reason. Server-enforced for `cancel`. */
  requiresReason: boolean;
};

const SPECS: Record<BookingAction, BookingActionSpec> = {
  start: {
    action: 'start',
    // "Start event", not "Start booking". The booking was made when the request
    // was sent; this records that the event itself is happening. Clients read
    // the older label as the act of booking something and hesitate over a
    // button that only moves an existing booking to In Progress.
    label: 'Start event',
    title: 'Start the event for booking {ref}?',
    description:
      'This marks the event as under way, and both you and the other party will see the booking ' +
      'move to In Progress. It is a record that the service has begun — it books nothing new and ' +
      'moves no money on its own, and the escrow balance still waits for the booking to be ' +
      'completed.',
    confirmLabel: 'Start event',
    tone: 'secondary',
    from: ['confirmed'],
    // Either party alone. Both know the event has begun, and requiring a
    // handshake would strand the booking on the one day nobody is at a desk.
    actors: ['client', 'vendor'],
    requiresReason: false,
  },
  accept: {
    action: 'accept',
    // "and terms", because since payment terms became part of the request this
    // button agrees to two things: the date, and how the vendor gets paid. A
    // vendor who reads it as "accept the date" is agreeing to the other one
    // without noticing, and on the off-platform rail that is a decision to
    // stand outside Sinnapi's protection.
    label: 'Accept date and terms',
    title: 'Accept booking {ref}?',
    description:
      'You are agreeing to both the date and the payment terms the client proposed. The client ' +
      'is told you have taken the job and the date is held for them. If the terms are escrow, ' +
      'this also opens the payment step — nothing can be funded until you have confirmed.',
    confirmLabel: 'Accept booking',
    tone: 'success',
    from: ['requested'],
    actors: ['vendor'],
    requiresReason: false,
  },
  counter: {
    action: 'counter',
    label: 'Propose other terms',
    title: 'Propose different payment terms for {ref}?',
    description:
      'The date is not held and nothing is agreed yet — this goes back to the client, who can ' +
      'accept your terms or decline the booking. You can only do this once, so say why.',
    confirmLabel: 'Send to client',
    tone: 'secondary',
    from: ['requested'],
    actors: ['vendor'],
    requiresReason: true,
  },
  decline: {
    action: 'decline',
    label: 'Decline request',
    title: 'Decline booking {ref}?',
    description:
      'The client is told you cannot take the job and the date is released. This cannot be ' +
      'undone — if you change your mind, the client has to send a fresh request. If it is only ' +
      'the payment terms you object to, propose different ones instead.',
    confirmLabel: 'Decline request',
    tone: 'error',
    from: ['requested'],
    actors: ['vendor'],
    requiresReason: true,
  },
  complete: {
    action: 'complete',
    label: 'Mark completed',
    title: 'Mark booking {ref} completed?',
    description:
      'This says the service has been delivered. It is what lets you ask for the money still ' +
      'held for you, and the client is asked to approve that release — so only mark it once the ' +
      'work is genuinely done. It cannot be undone from here.',
    confirmLabel: 'Mark completed',
    tone: 'success',
    from: ['confirmed', 'in_progress'],
    actors: ['vendor'],
    requiresReason: false,
  },
};

export function bookingActionSpec(action: BookingAction): BookingActionSpec {
  return SPECS[action];
}

/**
 * The actions this portal may offer for a booking in this state, in the order
 * they should appear. Gates the server also applies — the event date, whether
 * escrow is funded — are not knowable from a status alone and are layered on by
 * the caller; see each portal's booking actions hook.
 */
export function availableBookingActions(status: string, actor: BookingActor): BookingActionSpec[] {
  return BOOKING_ACTIONS.map((a) => SPECS[a]).filter(
    (s) => s.from.includes(status) && s.actors.includes(actor),
  );
}

/**
 * Whether a booking can be started, and if not, why.
 *
 * `start_booking` applies three gates and the two party portals both need to
 * explain all three, so the rule is written once here rather than twice as JSX
 * conditions. A disabled button with no sentence beside it is the worst version
 * of this screen — the person is ready to start their event and the page simply
 * refuses — so the blocked case always returns copy, never just `false`.
 *
 * The server remains the enforcement. This exists so the UI can decline to
 * offer a button that would be rejected, and say why.
 */
export type BookingStartGate = {
  canStart: boolean;
  /** Why not, phrased for whoever is looking at it. `null` when it can start. */
  blockedReason: string | null;
};

export function evaluateBookingStartGate(input: {
  status: string;
  /** `bookings.event_date` — a plain `YYYY-MM-DD` date, not an instant. */
  eventDate: string | null;
  /** `escrow_transactions.status`, or `null` when nothing has been funded. */
  escrowStatus: string | null;
  /** Today as `YYYY-MM-DD` in the viewer's own timezone. */
  today: string;
}): BookingStartGate {
  const { status, eventDate, escrowStatus, today } = input;

  if (status === 'in_progress') {
    return { canStart: false, blockedReason: null };
  }
  if (status !== 'confirmed') {
    return {
      canStart: false,
      blockedReason: 'The event can only be started once the vendor has confirmed the booking.',
    };
  }
  // Compared as calendar dates: a booking is startable from the first moment
  // of its event day, not from midnight UTC on it.
  if (eventDate && today < eventDate) {
    return {
      canStart: false,
      blockedReason: 'This becomes available on the event date.',
    };
  }
  // 'held' is funded and waiting; 'advance_released' is funded with the advance
  // already sent on. Both mean the money is in.
  if (!['held', 'advance_released'].includes(escrowStatus ?? '')) {
    return {
      canStart: false,
      blockedReason:
        'The booking has to be paid into escrow before the event can start. That is what protects ' +
        'both sides once the work begins.',
    };
  }
  return { canStart: true, blockedReason: null };
}

/** Today as `YYYY-MM-DD` in the viewer's own timezone, for the date gate above. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * East Africa Time, as a fixed offset from UTC.
 *
 * Bookings store a bare `date` and a bare `time` with no zone of their own, and
 * every event they describe happens in Uganda — so "18:00" means 18:00 in
 * Kampala, not wherever the browser happens to be. EAT has never observed DST,
 * which is the only reason a constant is honest here; a zone with a summer
 * shift would need the tz database and this would be a bug twice a year.
 *
 * `booking_end_at` on the server reads the same instant through
 * `at time zone 'Africa/Kampala'`, so the button unlocks in the UI at the
 * moment the server starts accepting the write, not before and not after.
 */
const EAT_OFFSET_HOURS = 3;

/**
 * The instant a booking's event is over, in epoch milliseconds.
 *
 * `null` when there is no event date to reason about — the caller then has no
 * gate to apply and says so rather than inventing one.
 */
export function bookingEndInstant(
  eventDate: string | null | undefined,
  endTime: string | null | undefined,
): number | null {
  if (!eventDate) return null;
  const [y, m, d] = eventDate.split('-').map(Number);
  if (!y || !m || !d) return null;

  // No end time agreed means the whole day is the vendor's: the event is over
  // when the day is. With one, it is over at that time.
  if (!endTime) return Date.UTC(y, m - 1, d + 1, -EAT_OFFSET_HOURS, 0, 0);

  const [hh, mm] = endTime.split(':').map(Number);
  return Date.UTC(y, m - 1, d, (hh || 0) - EAT_OFFSET_HOURS, mm || 0, 0);
}

export type BookingCompletionGate = {
  canComplete: boolean;
  /** Why not, phrased for whoever is looking at it. `null` when it can. */
  blockedReason: string | null;
  /** When the gate opens, for a countdown beside the disabled button. */
  availableAt: number | null;
};

/**
 * Whether a booking can be marked completed, and if not, why.
 *
 * Completing a booking is the vendor saying the service was delivered. It is
 * also what opens the escrow release window and lets them ask for the money
 * being held — so a booking completed before its event has even happened tells
 * the client their event is done, tells the console the same, and starts a
 * payout clock on work nobody has performed. There was no gate on this at all
 * until now, in the UI or on the server.
 *
 * The gate is the *end* of the event rather than its start: a vendor cannot
 * know at 09:00 that a job running until 18:00 went well.
 *
 * The server enforces the same rule in `complete_booking`. This exists so the
 * page can refuse in advance and say when it will unlock, rather than letting
 * the vendor press a button that is going to be rejected.
 */
export function evaluateBookingCompletionGate(input: {
  status: string;
  /** `bookings.event_date` — a plain `YYYY-MM-DD` date. */
  eventDate: string | null;
  /** `bookings.end_time` — a plain `HH:MM:SS`, or null when open-ended. */
  endTime: string | null;
  /** Now, in epoch milliseconds. Passed in so the rule stays pure. */
  now?: number;
}): BookingCompletionGate {
  const { status, eventDate, endTime, now = Date.now() } = input;

  if (!['confirmed', 'in_progress'].includes(status)) {
    return {
      canComplete: false,
      blockedReason: 'Only a confirmed or in-progress booking can be marked completed.',
      availableAt: null,
    };
  }

  const endsAt = bookingEndInstant(eventDate, endTime);
  // No date to judge by. The server has the same booking and will apply the
  // same rule; blocking here on missing data would strand a vendor over a
  // column they cannot fill in.
  if (endsAt === null) return { canComplete: true, blockedReason: null, availableAt: null };

  if (now < endsAt) {
    return {
      canComplete: false,
      blockedReason: endTime
        ? 'This unlocks when the event ends. Marking a booking completed tells the client the ' +
          'service was delivered and starts the release of the money held for you, so it waits ' +
          'for the event to actually be over.'
        : 'This unlocks at the end of the event day. Marking a booking completed tells the client ' +
          'the service was delivered and starts the release of the money held for you.',
      availableAt: endsAt,
    };
  }

  return { canComplete: true, blockedReason: null, availableAt: endsAt };
}

/** `start_booking` and `admin_set_booking_status` refusals, in plain language. */
const BOOKING_ACTION_ERRORS: Record<string, string> = {
  booking_not_confirmed: 'This booking has to be confirmed by the vendor first.',
  booking_not_yet_due: 'The event can only be started on or after its date.',
  booking_not_funded:
    'This booking has to be paid into escrow before the event can start. That is what protects ' +
    'both sides once work begins.',
  booking_not_completable: 'Only a confirmed or in-progress booking can be marked completed.',
  booking_not_ended:
    'This booking cannot be marked completed until its event has ended. If the event genuinely ' +
    'finished early, ask our team to complete it for you and they will record why.',
  booking_not_pending:
    'This booking has already been answered. Reload the page to see where it got to.',
  terms_set_by_event:
    'These terms are set on the event this booking belongs to, so they cannot be renegotiated ' +
    'here. Accept the booking or decline it.',
  terms_already_countered:
    'You have already proposed different terms on this booking. The client is deciding.',
  counter_same_as_proposed:
    'That is the way of paying the client already asked for — accept the booking instead.',
  counter_required: 'Choose the way of paying you would rather use.',
  unsupported_action: 'That is not something you can do to this booking.',
  invalid_transition: 'That is not a move this booking can make from its current state.',
  unsupported_status: 'That status cannot be set from here.',
  reason_required: 'A reason is required for this change.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  not_found: 'This booking no longer exists.',
  forbidden: 'You do not have permission to change this booking.',
};

/**
 * Turns whatever a booking status write failed with into something a person can
 * act on. Same reader as the quotation side — see `rpcError.ts` for why a
 * Supabase failure cannot be read with `instanceof Error`.
 */
export function bookingActionError(error: unknown): string {
  return rpcErrorMessage(error, BOOKING_ACTION_ERRORS);
}

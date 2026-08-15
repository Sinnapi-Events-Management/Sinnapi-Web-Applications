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
export const BOOKING_ACTIONS = ['start', 'accept', 'decline', 'complete'] as const;

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
    label: 'Accept request',
    title: 'Accept booking {ref}?',
    description:
      'The client is told you have taken the job and the date is held for them. Accepting also ' +
      'opens the payment step — nothing can be funded until you have confirmed.',
    confirmLabel: 'Accept request',
    tone: 'success',
    from: ['requested'],
    actors: ['vendor'],
    requiresReason: false,
  },
  decline: {
    action: 'decline',
    label: 'Decline request',
    title: 'Decline booking {ref}?',
    description:
      'The client is told you cannot take the job and the date is released. This cannot be ' +
      'undone — if you change your mind, the client has to send a fresh request.',
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
      'This says the service has been delivered. It starts the escrow release window, which is ' +
      'what puts the remaining balance on its way to you — so only mark it once the work is ' +
      'genuinely done. It cannot be undone from here.',
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

/** `start_booking` and `admin_set_booking_status` refusals, in plain language. */
const BOOKING_ACTION_ERRORS: Record<string, string> = {
  booking_not_confirmed: 'This booking has to be confirmed by the vendor first.',
  booking_not_yet_due: 'The event can only be started on or after its date.',
  booking_not_funded:
    'This booking has to be paid into escrow before the event can start. That is what protects ' +
    'both sides once work begins.',
  booking_not_completable: 'Only a confirmed or in-progress booking can be marked completed.',
  invalid_transition: 'That is not a move this booking can make from its current state.',
  unsupported_status: 'That status cannot be set from here.',
  reason_required: 'A reason is required for this change.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  not_found: 'This booking no longer exists.',
  forbidden: 'You do not have permission to change this booking.',
};

/** Turns a Postgres exception string into something a person can act on. */
export function bookingActionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  for (const [key, message] of Object.entries(BOOKING_ACTION_ERRORS)) {
    if (raw.includes(key)) return message;
  }
  return raw || 'Something went wrong. Please try again.';
}

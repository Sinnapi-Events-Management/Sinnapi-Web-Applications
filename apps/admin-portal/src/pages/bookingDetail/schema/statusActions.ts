/**
 * The booking lifecycle as the console may drive it, as data.
 *
 * Deliberately a separate spec from `bookingTransitions` in `@sinnapi/ui`,
 * which describes the same graph for the client and vendor portals. Three
 * things differ here and every one of them would otherwise become a branch in
 * the shared file: an override targets a *status* rather than an action, it
 * always carries a justification, and its copy addresses an operator acting on
 * someone else's booking. Two specs because there are two audiences.
 *
 * The `from` sets mirror `admin_set_booking_status`. An admin waives the date
 * and funding gates the parties face — that is the support lever — but never
 * the ordering, so nothing here offers a jump the server would refuse.
 */
export const BOOKING_STATUS_TARGETS = [
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type BookingStatusTarget = (typeof BOOKING_STATUS_TARGETS)[number];

export type BookingStatusSpec = {
  status: BookingStatusTarget;
  /** Button label in the status control. */
  label: string;
  /** Dialog heading. `{ref}` is replaced with the booking reference. */
  title: string;
  /** What the override actually causes — the consequence, never "are you sure". */
  description: string;
  confirmLabel: string;
  /** Drives the dialog badge and the primary button colour. */
  tone: 'primary' | 'secondary' | 'error' | 'success';
  /** Statuses this target may be reached from. */
  from: readonly string[];
};

const SPECS: Record<BookingStatusTarget, BookingStatusSpec> = {
  confirmed: {
    status: 'confirmed',
    label: 'Confirm',
    title: 'Confirm booking {ref} on the vendor’s behalf?',
    description:
      'The client is told the vendor has taken the job, and the payment step opens — nothing can ' +
      'be funded until a booking is confirmed. Use this when the vendor has accepted out of band ' +
      'and cannot record it themselves.',
    confirmLabel: 'Confirm booking',
    tone: 'success',
    from: ['requested'],
  },
  in_progress: {
    status: 'in_progress',
    label: 'Mark in progress',
    title: 'Move booking {ref} to In Progress?',
    description:
      'This marks the event as under way and both parties see it immediately. As an admin you can ' +
      'do this before the event date and before escrow is funded — the gates the client and ' +
      'vendor face do not apply to you — so use it to unblock a booking, not routinely.',
    confirmLabel: 'Mark in progress',
    tone: 'secondary',
    from: ['confirmed'],
  },
  completed: {
    status: 'completed',
    label: 'Mark completed',
    title: 'Mark booking {ref} completed?',
    description:
      'This says the service was delivered, and it opens the escrow release window — the step ' +
      'that puts the remaining balance on its way to the vendor. Money follows from this one, so ' +
      'only set it on evidence the work was done.',
    confirmLabel: 'Mark completed',
    tone: 'success',
    from: ['confirmed', 'in_progress'],
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancel booking',
    title: 'Cancel booking {ref}?',
    description:
      'The booking ends and the date is released to the vendor’s calendar. Money already held in ' +
      'escrow is not returned by this — a refund stays a separate, separately approved decision. ' +
      'The reason you give is shown to both parties.',
    confirmLabel: 'Cancel booking',
    tone: 'error',
    from: ['requested', 'confirmed', 'in_progress'],
  },
};

export function bookingStatusSpec(status: BookingStatusTarget): BookingStatusSpec {
  return SPECS[status];
}

/** The overrides offered for a booking in this state, in lifecycle order. */
export function availableStatusTargets(status: string): BookingStatusSpec[] {
  return BOOKING_STATUS_TARGETS.map((s) => SPECS[s]).filter((spec) => spec.from.includes(status));
}

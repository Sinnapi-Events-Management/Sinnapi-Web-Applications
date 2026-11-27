import type { BookingAction } from '@sinnapi/ui';

/**
 * "What do I do now?" for one booking, as data. Pure, so every state is
 * readable in one place and testable without rendering.
 *
 * Vendors told us they opened a booking and could not tell whether anything
 * was expected of them. Each state below therefore answers with one sentence
 * and at most one main button; everything else on the page is reference.
 */

export type NextStepInput = {
  status: string;
  /** `escrow` (paid through Sinnapi), `direct` (paid off platform) or unknown. */
  rail: 'escrow' | 'direct' | null;
  /** The vendor offered other terms and the client has not answered yet. */
  awaitingClientOnTerms: boolean;
  /** Escrow has been paid into by the client. */
  isFunded: boolean;
  /** Escrow has been paid out to the vendor in full. */
  isPaidOut: boolean;
  /** Days from today to the event (negative = past); null when undated. */
  eventDays: number | null;
  /** "11 days ago", "today"… for sentences. */
  eventWhen: string | null;
  canComplete: boolean;
  canStart: boolean;
  /** Actions the vendor may take right now, already gated. */
  available: BookingAction[];
  settlement: {
    /** Sinnapi has put an offer to the vendor that needs an answer. */
    mustRespond: boolean;
    canRequest: boolean;
    /** A request is open and moving. */
    inProgress: boolean;
    blockedReason: string | null;
    claimable: string | null;
  };
  cancellationReason: string | null;
};

export type NextStepPrimary =
  | { kind: 'action'; action: BookingAction; label: string }
  | { kind: 'money'; label: string };

export type NextStep = {
  /** Labels for the progress bar; empty when the booking left the happy path. */
  steps: string[];
  /** Index of the step the booking is on (all steps before it are done). */
  current: number;
  /** `todo` asks the vendor for something; the others only inform. */
  tone: 'todo' | 'waiting' | 'ok' | 'stopped';
  title: string;
  body: string;
  primary: NextStepPrimary | null;
  /** Other actions, shown smaller under the main button. */
  secondary: BookingAction[];
};

const ESCROW_STEPS = ['Request', 'Booked', 'Event day', 'Done', 'Paid'];
const DIRECT_STEPS = ['Request', 'Booked', 'Event day', 'Done'];

export function bookingNextStep(i: NextStepInput): NextStep {
  const steps = i.rail === 'direct' ? DIRECT_STEPS : ESCROW_STEPS;
  const has = (a: BookingAction) => i.available.includes(a);
  const base = { steps, secondary: [] as BookingAction[], primary: null as NextStepPrimary | null };

  if (i.status === 'cancelled' || i.status === 'declined') {
    return {
      ...base,
      steps: [],
      current: 0,
      tone: 'stopped',
      title: i.status === 'declined' ? 'This request was declined' : 'This booking was cancelled',
      body: i.cancellationReason
        ? `Reason given: ${i.cancellationReason}`
        : 'Nothing more is needed from you on this booking.',
    };
  }

  if (i.status === 'requested') {
    if (i.awaitingClientOnTerms) {
      return {
        ...base,
        current: 0,
        tone: 'waiting',
        title: 'Waiting for the client',
        body: 'You offered different payment terms. We will tell you when the client answers.',
      };
    }
    return {
      ...base,
      current: 0,
      tone: 'todo',
      title: 'New request — please answer',
      body: 'Check the date, place and amount below. If they suit you, accept the booking.',
      primary: has('accept') ? { kind: 'action', action: 'accept', label: 'Accept booking' } : null,
      secondary: (['counter', 'decline'] as BookingAction[]).filter(has),
    };
  }

  if (i.status === 'confirmed' || i.status === 'in_progress') {
    if (i.rail === 'escrow' && !i.isFunded) {
      return {
        ...base,
        current: 1,
        tone: 'waiting',
        title: 'Waiting for the client to pay',
        body:
          'The client pays into Sinnapi, where the money is kept safe for you. ' +
          'We will tell you when it is in. You do not need to do anything yet.',
      };
    }
    if (i.canComplete) {
      return {
        ...base,
        current: 2,
        tone: 'todo',
        title: 'Is the work done? Mark it as done',
        body:
          `The event was ${i.eventWhen ?? 'on the booked date'}. ` +
          (i.rail === 'escrow'
            ? 'Mark it as done so you can ask for your money.'
            : 'Mark it as done to close this booking.'),
        primary: has('complete')
          ? { kind: 'action', action: 'complete', label: 'Mark as done' }
          : null,
      };
    }
    if (i.eventDays === 0 || i.status === 'in_progress') {
      const offerStart = i.status === 'confirmed' && i.rail === 'escrow' && i.canStart;
      return {
        ...base,
        current: 2,
        tone: offerStart ? 'todo' : 'ok',
        title: i.status === 'in_progress' ? 'The event is happening' : 'The event is today',
        body: offerStart
          ? 'Tap "Start event" when the work begins. After it ends, mark it as done.'
          : 'When the work is finished, come back here and mark it as done.',
        primary: offerStart ? { kind: 'action', action: 'start', label: 'Start event' } : null,
      };
    }
    return {
      ...base,
      current: 1,
      tone: 'ok',
      title: 'You are booked',
      body:
        `The event is ${i.eventWhen?.toLowerCase() ?? 'coming up'}. Nothing to do until then.` +
        (i.rail === 'escrow' ? ' The client’s money is safe with Sinnapi.' : ''),
    };
  }

  if (i.status === 'completed') {
    if (i.rail !== 'escrow') {
      return {
        ...base,
        current: steps.length,
        tone: 'ok',
        title: 'This booking is finished',
        body: 'Well done! The client paid you directly, so there is nothing more to do here.',
      };
    }
    if (i.isPaidOut) {
      return {
        ...base,
        current: steps.length,
        tone: 'ok',
        title: 'You have been paid in full',
        body: 'All the money for this booking has been sent to you.',
      };
    }
    if (i.settlement.mustRespond) {
      return {
        ...base,
        current: 4,
        tone: 'todo',
        title: 'Sinnapi has a payment offer for you',
        body: 'Please look at the amount and accept it or say why you disagree.',
        primary: { kind: 'money', label: 'See the offer' },
      };
    }
    if (i.settlement.canRequest) {
      return {
        ...base,
        current: 4,
        tone: 'todo',
        title: 'Ask for your money',
        body: i.settlement.claimable
          ? `${i.settlement.claimable} is waiting for you. Ask Sinnapi to send it.`
          : 'Your money is waiting for you. Ask Sinnapi to send it.',
        primary: { kind: 'money', label: 'Ask for my money' },
      };
    }
    if (i.settlement.inProgress) {
      return {
        ...base,
        current: 4,
        tone: 'waiting',
        title: 'We are working on your payment',
        body: 'Your request is with Sinnapi. We will tell you when the money is sent.',
        primary: { kind: 'money', label: 'See payment details' },
      };
    }
    return {
      ...base,
      current: 4,
      tone: 'waiting',
      title: 'Your payment needs our help',
      body: i.settlement.blockedReason ?? 'See the Money tab for where your payment is.',
      primary: { kind: 'money', label: 'See payment details' },
    };
  }

  return { ...base, current: 0, tone: 'ok', title: 'Booking', body: '' };
}

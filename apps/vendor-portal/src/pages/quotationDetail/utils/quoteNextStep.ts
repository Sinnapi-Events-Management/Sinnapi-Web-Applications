/**
 * "What do I do now?" for one quotation, as data — the quotation twin of the
 * booking page's `nextStep`. Pure, so every state reads in one place.
 */

export type QuoteNextStepInput = {
  status: string;
  /** `package` when the client ordered one of the vendor's published packages. */
  quoteOrigin: string | null;
  /** The price passed its valid-until date (or the row is `expired`). */
  isLapsed: boolean;
  /** "13 Nov 2026", for sentences. */
  validUntilLabel: string | null;
  /** Whole days left on the price; null when undated. */
  daysLeft: number | null;
  /** What the client last said (changes asked, why they declined…). */
  clientNote: string | null;
  bookingStage: 'not-accepted' | 'bookable' | 'booked' | 'released';
  bookingId: string | null;
  canWithdraw: boolean;
};

export type QuotePrimary =
  | { kind: 'build'; label: string; title: string; prefill: boolean }
  | { kind: 'tab'; tab: 'quote'; label: string }
  | { kind: 'link'; to: string; label: string };

export type QuoteNextStep = {
  steps: string[];
  current: number;
  tone: 'todo' | 'waiting' | 'ok' | 'stopped';
  title: string;
  body: string;
  /** The client's words, quoted under the body when they matter. */
  quote: string | null;
  primary: QuotePrimary | null;
  showWithdraw: boolean;
};

const STEPS = ['Request', 'Price sent', 'Accepted', 'Booked'];

export function quoteNextStep(i: QuoteNextStepInput): QuoteNextStep {
  const base = {
    steps: STEPS,
    quote: null as string | null,
    primary: null as QuotePrimary | null,
    showWithdraw: false,
  };

  switch (i.status) {
    case 'requested':
    case 'draft':
      if (i.quoteOrigin === 'package' && i.status === 'requested') {
        return {
          ...base,
          current: 0,
          tone: 'todo',
          title: 'The client chose one of your packages',
          body: 'Check the order, then approve it or change the price.',
          primary: { kind: 'tab', tab: 'quote', label: 'Review the order' },
        };
      }
      return {
        ...base,
        current: 0,
        tone: 'todo',
        title: 'New request — send your price',
        body: 'Read what the client asked for, then tell them what it will cost.',
        primary: {
          kind: 'build',
          label: 'Price this request',
          title: 'Price this request',
          prefill: false,
        },
      };

    case 'revised':
      return {
        ...base,
        current: 1,
        tone: 'todo',
        title: 'The client asked for changes',
        body: 'Change your price or items and send it again.',
        quote: i.clientNote,
        primary: {
          kind: 'build',
          label: 'Update the quote',
          title: 'Update your quote',
          prefill: true,
        },
        showWithdraw: i.canWithdraw,
      };

    case 'expired':
    case 'sent':
      if (i.isLapsed || i.status === 'expired') {
        return {
          ...base,
          current: 1,
          tone: 'todo',
          title: 'Your price has expired',
          body: 'The client can no longer accept it. If you still want the job, send a new price.',
          primary: {
            kind: 'build',
            label: 'Send a new price',
            title: 'Send a new price',
            prefill: true,
          },
          showWithdraw: i.canWithdraw,
        };
      }
      return {
        ...base,
        current: 1,
        tone: 'waiting',
        title: 'Waiting for the client',
        body:
          (i.validUntilLabel
            ? `Your price is valid until ${i.validUntilLabel}` +
              (i.daysLeft !== null
                ? i.daysLeft === 0
                  ? ' (today is the last day). '
                  : ` (${i.daysLeft} day${i.daysLeft === 1 ? '' : 's'} left). `
                : '. ')
            : '') + 'We will tell you when they answer.',
        showWithdraw: i.canWithdraw,
      };

    case 'accepted':
      if (i.bookingStage === 'booked' && i.bookingId) {
        return {
          ...base,
          current: STEPS.length,
          tone: 'ok',
          title: 'The client booked a date',
          body: 'Open the booking to answer it and see the money.',
          primary: { kind: 'link', to: `/bookings/${i.bookingId}`, label: 'Open the booking' },
        };
      }
      if (i.bookingStage === 'released') {
        return {
          ...base,
          current: 3,
          tone: 'stopped',
          title: 'The booking from this quote ended',
          body: 'It was declined or cancelled. Open it to see why.',
          primary: i.bookingId
            ? { kind: 'link', to: `/bookings/${i.bookingId}`, label: 'Open the booking' }
            : null,
        };
      }
      return {
        ...base,
        current: 2,
        tone: 'waiting',
        title: 'Accepted — the client will pick a date',
        body: 'Nothing to do yet. When they book, you will get a booking request to answer.',
      };

    case 'declined':
      return {
        ...base,
        steps: [],
        current: 0,
        tone: 'stopped',
        title: 'The client declined this quote',
        body: i.clientNote ? 'This is what they said:' : 'Nothing more is needed from you.',
        quote: i.clientNote,
      };

    case 'voided':
      return {
        ...base,
        steps: [],
        current: 0,
        tone: 'stopped',
        title: 'This quote was cancelled',
        body: i.clientNote ? 'The reason given:' : 'Nothing more is needed from you.',
        quote: i.clientNote,
      };

    default:
      return { ...base, current: 0, tone: 'ok', title: 'Quote', body: '' };
  }
}

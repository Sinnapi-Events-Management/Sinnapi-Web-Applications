import { isQuotationSettled } from '@sinnapi/ui';
import type { VendorEventQuotationModel } from '@/lib/types';

/**
 * Where a vendor stands on one event, or on one line of it.
 *
 * The page's central derivation, and the reason the Quote tab is not just a
 * list: "I expressed interest but never sent anything" is the single most
 * common dead end in this flow, and it is invisible in a status column —
 * `express_event_interest` opens a `draft` quotation and returns it, so an
 * abandoned expression of interest looks exactly like a quote in progress. The
 * standing below names it and hands back the copy for the button that resolves
 * it.
 */

/** Statuses where the quote is still the vendor's move. */
const VENDOR_TO_ACT = ['draft', 'requested', 'revised'];

export type QuoteStandingKey = 'none' | 'unsent' | 'awaiting' | 'accepted' | 'closed';

export type QuoteStanding = {
  key: QuoteStandingKey;
  /** The quote the standing is about, when there is one to open. */
  quotation: VendorEventQuotationModel | null;
  /** Headline, in the vendor's own terms — not the status token. */
  label: string;
  /** One sentence saying what happens next, and whose move it is. */
  detail: string;
  /** Label for the control that advances it, or null when there is nothing to do. */
  ctaLabel: string | null;
};

/**
 * How advanced each standing is. Picking the *highest* is what makes a vendor
 * with two quotes on one event read as "accepted" rather than as whichever row
 * PostgREST happened to return first — an accepted quote is the fact about the
 * relationship, and an old declined one beside it is history.
 */
const RANK: Record<QuoteStandingKey, number> = {
  none: 0,
  closed: 1,
  awaiting: 2,
  unsent: 3,
  accepted: 4,
};

function standingOf(quote: VendorEventQuotationModel): QuoteStanding {
  if (quote.status === 'accepted') {
    return {
      key: 'accepted',
      quotation: quote,
      label: 'Quote accepted',
      detail: 'The client accepted your price. The booking is under the Booking tab.',
      ctaLabel: 'Open quote',
    };
  }

  if (isQuotationSettled(quote.status)) {
    return {
      key: 'closed',
      quotation: quote,
      label: 'Quote closed',
      detail: 'This quote is no longer live. Open it to see what the client said.',
      ctaLabel: 'Open quote',
    };
  }

  if (VENDOR_TO_ACT.includes(quote.status)) {
    return {
      key: 'unsent',
      quotation: quote,
      // The distinction the whole page turns on: a quote exists, and the
      // client cannot see it. Saying "draft" would be the database's word for
      // a situation the vendor experiences as "I never actually replied".
      label: 'Your quote is not sent yet',
      detail:
        'You put your hand up and a quote was opened for you, but the client has not seen a ' +
        'price. Finish it and send it.',
      ctaLabel: 'Finish your quote',
    };
  }

  return {
    key: 'awaiting',
    quotation: quote,
    label: 'Waiting on the client',
    detail: 'Your price is with the client. They can accept it, or come back asking for changes.',
    ctaLabel: 'Open quote',
  };
}

/** Nothing sent, nothing opened — the state every vendor starts an event in. */
const NO_QUOTE: QuoteStanding = {
  key: 'none',
  quotation: null,
  label: 'You have not quoted for this event',
  detail:
    'Expressing interest opens a quote for you and tells the client you are available. You can ' +
    'price it now or come back to it.',
  ctaLabel: 'Express interest',
};

/**
 * The standing across a set of quotes — the whole event's, or one line's once
 * the caller has filtered to it.
 */
export function quoteStanding(quotes: VendorEventQuotationModel[]): QuoteStanding {
  return quotes.reduce<QuoteStanding>((best, quote) => {
    const next = standingOf(quote);
    return RANK[next.key] > RANK[best.key] ? next : best;
  }, NO_QUOTE);
}

/**
 * Quotes the vendor still has to act on — the Quote tab's badge.
 *
 * Work, not rows. A badge counting how many quotes exist is a number that never
 * reaches zero and that a vendor cannot act on; this one is the count of prices
 * the client is still waiting for, and it clears when they are sent.
 */
export function unsentQuoteCount(quotes: VendorEventQuotationModel[]): number {
  return quotes.filter((quote) => VENDOR_TO_ACT.includes(quote.status)).length;
}

/**
 * How a line's priority reads on a card. `must_have` is left unlabelled on
 * purpose — it is the default, and a chip on every row carries no signal.
 */
export function priorityLabel(priority: string): string | null {
  return priority === 'nice_to_have' ? 'Nice to have' : null;
}

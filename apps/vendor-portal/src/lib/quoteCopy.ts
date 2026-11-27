import { daysFromToday } from './bookingCopy';

/** The client's request as one short line for a list card. */
export function requestSnippet(text: string | null | undefined, max = 60): string | null {
  const line = text?.trim().split(/\r?\n/)[0]?.trim();
  if (!line) return null;
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** A sent price whose valid-until date has gone by. */
export function isQuoteExpired(status: string, validUntil: string | null | undefined): boolean {
  if (status === 'expired') return true;
  const days = daysFromToday(validUntil);
  return (status === 'sent' || status === 'revised') && days !== null && days < 0;
}

/**
 * The one line a quotation card shows: what the vendor should do, or what
 * they are waiting for. `hasBooking` comes from the per-page booking lookup.
 */
export function quoteListHint(q: {
  status: string;
  valid_until: string | null;
  hasBooking: boolean;
}): { text: string; urgent: boolean } | null {
  if (q.status === 'requested') return { text: 'Price this request', urgent: true };
  if (q.status === 'revised') return { text: 'Client asked for changes', urgent: true };
  if (isQuoteExpired(q.status, q.valid_until)) {
    return { text: 'Price expired — send a new one', urgent: true };
  }
  if (q.status === 'sent') {
    const days = daysFromToday(q.valid_until);
    return {
      text:
        days === null
          ? 'Waiting for the client'
          : days === 0
            ? 'Waiting for the client · last day'
            : `Waiting for the client · ${days} day${days === 1 ? '' : 's'} left`,
      urgent: false,
    };
  }
  if (q.status === 'accepted') {
    return q.hasBooking
      ? { text: 'Booked', urgent: false }
      : { text: 'Accepted · client to pick a date', urgent: false };
  }
  return null;
}

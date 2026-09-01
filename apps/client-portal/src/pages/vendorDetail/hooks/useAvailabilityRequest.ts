import { useState } from 'react';
import type { AvailabilityDayState } from '../schema';

/**
 * What happens when a client taps a day.
 *
 * Two outcomes, and the split is the whole point. Tapping a free day is an
 * intent to book, so it opens the request with that date already in it — the
 * alternative is a calendar that shows someone their date is available and then
 * makes them re-enter it into a form. Tapping a taken day is a question, so it
 * gets an answer inline rather than a dialog they did not ask for.
 *
 * A past day does neither. It is on the grid only because the month it belongs
 * to has to be drawn, and there is nothing to say about it.
 *
 * Kept apart from `useVendorAvailability` because this is transient interaction
 * state that resets on every close, while that hook holds the read the whole
 * card is built from — mixing them would re-run the month derivations every time
 * a dialog opened.
 */
export function useAvailabilityRequest() {
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [blockedDate, setBlockedDate] = useState<string | null>(null);

  return {
    /** The date the booking dialog was opened with, or `null` while it is closed. */
    requestDate,
    /**
     * Whichever day the grid should show as selected. Either outcome selects a
     * day, and a notice describing the 18th while the grid highlights nothing is
     * a notice the reader has to match up by hand.
     */
    selectedDate: requestDate ?? blockedDate ?? '',
    /** The taken date the client last asked about, or `null` when nothing is queried. */
    blockedDate,
    selectDay: (date: string, state: AvailabilityDayState) => {
      if (state === 'past') return;
      if (state === 'open') {
        setBlockedDate(null);
        setRequestDate(date);
        return;
      }
      setRequestDate(null);
      setBlockedDate(date);
    },
    closeRequest: () => setRequestDate(null),
    dismissBlocked: () => setBlockedDate(null),
  };
}

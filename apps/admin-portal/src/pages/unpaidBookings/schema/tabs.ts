import type { StatusTabOption } from '@sinnapi/ui';
import type { UnpaidBookingState } from '@/hooks/queries';
import type { UnpaidBookingCounts } from '@/lib/types';

/**
 * The queue's three views, in the order an operator works them.
 *
 * "Overdue" leads because it is the only one with a decision attached — a
 * booking whose clock has run out is a date somebody has to choose whether to
 * release. Everything else on this page is watching.
 */
export function getStateTabs(counts?: UnpaidBookingCounts): StatusTabOption<UnpaidBookingState>[] {
  return [
    { value: 'overdue', label: 'Overdue', count: counts?.overdue },
    { value: 'awaiting', label: 'Still in window', count: counts?.awaiting },
    {
      value: 'all',
      label: 'All unpaid',
      count: counts != null ? counts.overdue + counts.awaiting : undefined,
    },
  ];
}

const EMPTY_MESSAGES: Record<UnpaidBookingState, string> = {
  overdue: 'No overdue payments. Every confirmed booking is either paid or still in its window.',
  awaiting: 'Nothing waiting on payment right now.',
  all: 'No unpaid bookings. Every confirmed escrow booking has been funded.',
};

/**
 * Empty-state copy for the current tab. A searched-to-nothing table says so —
 * otherwise it reads as "there are no unpaid bookings at all", which on this
 * particular page is a reassuring sentence that happens to be false.
 */
export function getEmptyMessage(state: UnpaidBookingState, searched: boolean): string {
  if (searched) return 'No unpaid bookings match your search.';
  return EMPTY_MESSAGES[state];
}

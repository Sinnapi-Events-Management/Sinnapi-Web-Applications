import type { ComponentType } from 'react';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';
import RateReviewIcon from '@mui/icons-material/RateReview';
import type { AccentColor, QueueKey } from './types';

/**
 * The queue catalogue. Order is the order a vendor should work them: unanswered
 * demand first — a request left sitting is a booking lost to whoever replied
 * faster — then money in flight, then reputation.
 *
 * `to` is the page whose default filter matches the same rows the RPC counted,
 * so a tile's number and the list it opens can never disagree.
 */
export type QueueDef = {
  key: QueueKey;
  label: string;
  to: string;
  accent: AccentColor;
  Icon: ComponentType<{ sx?: object }>;
};

export const QUEUES: QueueDef[] = [
  {
    key: 'booking_requests',
    label: 'Booking requests',
    to: '/bookings',
    accent: 'primary',
    Icon: EventNoteIcon,
  },
  {
    key: 'quote_requests',
    label: 'Quote requests',
    to: '/quotations',
    accent: 'secondary',
    Icon: RequestQuoteIcon,
  },
  {
    // Confirmed, but the client's money has not arrived. The vendor's date is
    // held off the market for it, so the cost of leaving it grows with the
    // calendar rather than with the backlog.
    key: 'unpaid',
    label: 'Awaiting payment',
    to: '/bookings',
    accent: 'warning',
    Icon: HourglassBottomIcon,
  },
  {
    key: 'escrow',
    label: 'In escrow',
    to: '/escrow',
    accent: 'info',
    Icon: AccountBalanceIcon,
  },
  {
    key: 'payouts',
    label: 'Payouts in flight',
    to: '/payouts',
    accent: 'success',
    Icon: PaymentsIcon,
  },
  {
    key: 'reviews',
    label: 'Reviews to answer',
    to: '/reviews',
    accent: 'error',
    Icon: RateReviewIcon,
  },
];

/** Icon lookup, so the presenter can stay free of JSX imports. */
export const QUEUE_ICONS: Record<QueueKey, ComponentType<{ sx?: object }>> = QUEUES.reduce(
  (acc, q) => ({ ...acc, [q.key]: q.Icon }),
  {} as Record<QueueKey, ComponentType<{ sx?: object }>>,
);

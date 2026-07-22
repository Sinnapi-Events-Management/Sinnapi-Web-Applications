import type { ComponentType } from 'react';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReplayIcon from '@mui/icons-material/Replay';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import type { QueueCardModel, QueueKey } from './types';

/**
 * The queue catalogue. Order is the order admins should work them: recurring
 * revenue at risk first — a lapsed renewal is money leaving the platform — then
 * compliance intake, money movement, and trust & safety.
 *
 * `perm` matches the permission guarding each queue's own route in `App.tsx`,
 * and the RPC gates the same key on the same permission — so a queue can never
 * appear as a card that its owner cannot then open.
 */
export type QueueDef = {
  key: QueueKey;
  label: string;
  to: string;
  perm: string;
  accent: QueueCardModel['accent'];
  Icon: ComponentType<{ sx?: object }>;
};

export const QUEUES: QueueDef[] = [
  {
    key: 'renewals',
    label: 'Renewals at risk',
    to: '/subscriptions',
    perm: 'subscriptions.manage',
    accent: 'error',
    Icon: AutorenewIcon,
  },
  {
    key: 'applications',
    label: 'Vendor applications',
    to: '/applications',
    perm: 'vendor.review',
    accent: 'primary',
    Icon: AssignmentTurnedInIcon,
  },
  {
    key: 'payouts',
    label: 'Payouts',
    to: '/payouts',
    perm: 'payout.approve',
    accent: 'info',
    Icon: PaymentsIcon,
  },
  {
    key: 'escrow',
    label: 'Escrow to action',
    to: '/escrow',
    perm: 'escrow.read',
    accent: 'secondary',
    Icon: AccountBalanceIcon,
  },
  {
    key: 'refunds',
    label: 'Refund requests',
    to: '/refunds',
    perm: 'refund.approve',
    accent: 'warning',
    Icon: ReplayIcon,
  },
  {
    key: 'disputes',
    label: 'Open disputes',
    to: '/disputes',
    perm: 'dispute.manage',
    accent: 'error',
    Icon: GavelIcon,
  },
];

/** Icon lookup, so the presenter can stay free of JSX imports. */
export const QUEUE_ICONS: Record<QueueKey, ComponentType<{ sx?: object }>> = QUEUES.reduce(
  (acc, q) => ({ ...acc, [q.key]: q.Icon }),
  {} as Record<QueueKey, ComponentType<{ sx?: object }>>,
);

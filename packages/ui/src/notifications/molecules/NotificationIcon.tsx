'use client';
import type { ReactNode } from 'react';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';
import ReplayIcon from '@mui/icons-material/Replay';
import GavelIcon from '@mui/icons-material/Gavel';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import ForumIcon from '@mui/icons-material/Forum';
import CelebrationIcon from '@mui/icons-material/Celebration';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { IconBadge } from '../../molecules/IconBadge';
import type { NotificationDomain } from '../types';

/**
 * Glyph per domain. Lives beside the badge rather than in the schema so the
 * schema stays a plain `.ts` data module with no JSX or icon dependency.
 */
const ICONS: Record<string, ReactNode> = {
  bookings: <EventNoteIcon />,
  quotations: <RequestQuoteIcon />,
  escrow: <AccountBalanceWalletIcon />,
  payments: <PaymentsIcon />,
  payouts: <SavingsIcon />,
  refunds: <ReplayIcon />,
  disputes: <GavelIcon />,
  finance: <ReceiptLongIcon />,
  subscriptions: <CardMembershipIcon />,
  reviews: <StarOutlineIcon />,
  messages: <ForumIcon />,
  events: <CelebrationIcon />,
  vendors: <StorefrontIcon />,
  applications: <AssignmentIndIcon />,
  promotions: <LocalOfferIcon />,
  system: <NotificationsIcon />,
};

export type NotificationIconProps = {
  domain: NotificationDomain;
  size?: number;
};

/** Tinted domain badge — the row's at-a-glance "what is this about". */
export function NotificationIcon({ domain, size = 40 }: NotificationIconProps) {
  return (
    <IconBadge accent={domain.accent} size={size} circular>
      {ICONS[domain.key] ?? ICONS.system}
    </IconBadge>
  );
}

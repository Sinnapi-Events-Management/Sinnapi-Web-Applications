import type { ElementType } from 'react';
import {
  Payments,
  VerifiedUser,
  AccountBalanceWallet,
  Security,
  CheckCircle,
} from '@sinnapi/ui/icons';

export type PayOption = {
  Icon: ElementType;
  title: string;
  body: string;
  points: string[];
  /** Highlights the safer, recommended choice with primary styling + a chip. */
  recommended?: boolean;
};

// Both payment routes from the spec: direct settlement vs full escrow protection.
export const PAY_OPTIONS: PayOption[] = [
  {
    Icon: Payments,
    title: 'Pay the vendor directly',
    body: 'Prefer to settle straight with your vendor? Pay them directly once you have agreed the details.',
    points: [
      'Best for vendors you already know and trust',
      'Fast, straightforward settlement',
      'You coordinate the payment terms together',
    ],
  },
  {
    Icon: VerifiedUser,
    title: 'Pay safely with Sinnapi Escrow',
    body: 'Let Sinnapi hold your payment until the job is done — so your money is never at risk.',
    points: [
      'Funds held securely until you confirm delivery',
      'Protection against no-shows and disputes',
      'Released to the vendor only when you are satisfied',
    ],
    recommended: true,
  },
];

export type EscrowStage = { Icon: ElementType; title: string; body: string };

// The escrow lifecycle, simplified to the three moments a client experiences.
export const ESCROW_FLOW: EscrowStage[] = [
  {
    Icon: AccountBalanceWallet,
    title: 'You pay Sinnapi',
    body: 'Your full payment is held securely in escrow — the vendor does not receive it yet.',
  },
  {
    Icon: Security,
    title: 'We hold it safely',
    body: 'Funds stay protected while your vendor delivers the service you agreed on.',
  },
  {
    Icon: CheckCircle,
    title: 'Released on confirmation',
    body: 'Once you confirm the service was delivered as promised, we settle with the vendor.',
  },
];

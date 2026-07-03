import type { ElementType } from 'react';
import { Verified, Lock, EventAvailable, SupportAgent } from '@mui/icons-material';

export type TrustSignal = { Icon: ElementType; title: string; body: string };

// Reassurances that de-risk the buying decision, shown as a band between the
// comparison table and the FAQs. Grounded in the platform's real guarantees
// (verification, escrow, free trial, support).
export const TRUST_SIGNALS: TrustSignal[] = [
  {
    Icon: Verified,
    title: 'Verified marketplace',
    body: 'Every vendor is vetted and badged, so your listing sits among trusted names clients already rely on.',
  },
  {
    Icon: Lock,
    title: 'Secure escrow payments',
    body: 'Client funds are held safely in Sinnapi Escrow and released only once the service is confirmed delivered.',
  },
  {
    Icon: EventAvailable,
    title: '30-day free trial',
    body: 'Try your plan free for 30 days after approval. No card upfront, no setup fees, cancel anytime.',
  },
  {
    Icon: SupportAgent,
    title: 'Real human support',
    body: 'Our team helps you set up your profile and keeps you visible — you are never on your own.',
  },
];

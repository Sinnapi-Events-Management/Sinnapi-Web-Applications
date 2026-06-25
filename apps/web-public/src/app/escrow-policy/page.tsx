import type { Metadata } from 'next';
import { escrowPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

export const metadata: Metadata = {
  title: 'Escrow Policy',
  alternates: { canonical: '/escrow-policy' },
};

export default function EscrowPolicyPage() {
  return <LegalContent document={escrowPolicy} />;
}

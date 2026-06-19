import type { Metadata } from 'next';
import { Typography } from '@sinnapi/ui';
import Prose from '@/components/common/Prose';

export const metadata: Metadata = {
  title: 'Escrow Policy',
  alternates: { canonical: '/escrow-policy' },
};

export default function EscrowPolicyPage() {
  return (
    <Prose title="Escrow Policy" subtitle="How Sinnapi Escrow protects clients and vendors.">
      <Typography component="p">
        When you choose Sinnapi Escrow, you pay 100% to Sinnapi through a licensed Payment Service
        Provider. Funds are held securely and released to the vendor once you confirm the service
        and our team approves release. Disputes are adjudicated by the Sinnapi team based on
        evidence and our service-level agreement; partial refunds may apply. This is placeholder
        content to be replaced with reviewed policy copy.
      </Typography>
    </Prose>
  );
}

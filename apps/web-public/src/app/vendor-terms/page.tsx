import type { Metadata } from 'next';
import { Typography } from '@sinnapi/ui';
import Prose from '@/components/common/Prose';

export const metadata: Metadata = {
  title: 'Vendor Terms',
  alternates: { canonical: '/vendor-terms' },
};

export default function VendorTermsPage() {
  return (
    <Prose title="Vendor Terms" subtitle="Obligations for vendors listed on Sinnapi.">
      <Typography component="p">
        By applying as a vendor you confirm that the information you provide is accurate, you accept
        the Vendor Terms and Escrow Policy, and you understand that providing false information
        results in removal from the platform. This is placeholder content to be replaced with
        reviewed legal copy.
      </Typography>
    </Prose>
  );
}

import { SectionGrid } from '@sinnapi/ui';
import type { PaymentAdminDetailModel } from '@/lib/types';
import PaymentFactsCard from './PaymentFactsCard';
import PaymentPartiesCard from './PaymentPartiesCard';
import PaymentEscrowCard from './PaymentEscrowCard';

type Props = { payment: PaymentAdminDetailModel };

/**
 * What this payment is, who it is between, and what it funded.
 *
 * The facts lead because every other question is asked against them; the
 * parties follow because contacting one of them is usually the next move; the
 * escrow comes last because it is the consequence of the first two.
 */
export default function OverviewSection({ payment }: Props) {
  return (
    <SectionGrid>
      <PaymentFactsCard payment={payment} />
      <PaymentPartiesCard payment={payment} />
      <PaymentEscrowCard payment={payment} />
    </SectionGrid>
  );
}

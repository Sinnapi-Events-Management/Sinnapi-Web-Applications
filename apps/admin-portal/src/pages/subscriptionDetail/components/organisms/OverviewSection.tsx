import { SectionGrid } from '@sinnapi/ui';
import type { SubscriptionAdminDetailModel } from '@/lib/types';
import SubscriptionFactsCard from './SubscriptionFactsCard';
import SubscriptionVendorCard from './SubscriptionVendorCard';

type Props = { subscription: SubscriptionAdminDetailModel };

/**
 * Where the subscription stands and whose it is. The facts lead because
 * every other question is asked against them; the vendor follows because
 * contacting the owner is usually the next move.
 */
export default function OverviewSection({ subscription }: Props) {
  return (
    <SectionGrid>
      <SubscriptionFactsCard subscription={subscription} />
      <SubscriptionVendorCard subscription={subscription} />
    </SectionGrid>
  );
}

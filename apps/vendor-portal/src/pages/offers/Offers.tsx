import { PageTitle, StatusTabs } from '@sinnapi/ui';
import { useUrlTab } from '@sinnapi/ui/router';
import VendorGate from '@/vendor/VendorGate';
import DiscountsWorkspace from '@/pages/discounts/components/organisms/DiscountsWorkspace';
import PromotionsWorkspace from '@/pages/promotions/components/organisms/PromotionsWorkspace';

const TABS = ['offers', 'sales'] as const;

/**
 * One page for money off (2026-11-17), replacing "Discounts" and "Promotions"
 * — vendors could not tell them apart, and the same codes showed on both.
 *
 * - **Offers**: the discounts themselves — what a client gets, and whether it
 *   applies automatically or with a code.
 * - **Sale names**: the old campaigns — a name, dates and a picture that
 *   offers can be grouped under. They carry no price of their own.
 */
export default function Offers() {
  const { tab, setTab } = useUrlTab(TABS);
  return (
    <>
      <PageTitle
        title="Offers"
        subtitle="Take money off your prices — for everyone, or for clients with your code."
      />
      <StatusTabs<(typeof TABS)[number]>
        options={[
          { value: 'offers', label: 'Offers' },
          { value: 'sales', label: 'Sale names' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Offers or sale names"
      />
      <VendorGate>
        {(vendorId) =>
          tab === 'offers' ? (
            <DiscountsWorkspace vendorId={vendorId} />
          ) : (
            <PromotionsWorkspace vendorId={vendorId} />
          )
        }
      </VendorGate>
    </>
  );
}

import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import PortfolioWorkspace from './components/organisms/PortfolioWorkspace';

/**
 * The vendor's portfolio — the photos and video a client sees on their public
 * profile, in the order the vendor arranged them.
 */
export default function Portfolio() {
  return (
    <>
      <PageTitle
        title="Portfolio"
        subtitle="Photos and video from your past events. Drag to set the order clients see."
      />
      <VendorGate>{(vendorId) => <PortfolioWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}

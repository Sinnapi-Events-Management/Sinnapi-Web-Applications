import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import PortfolioWorkspace from './components/organisms/PortfolioWorkspace';

/**
 * The vendor's photos and videos — what a client sees on their public profile,
 * in the order the vendor arranged them.
 *
 * Still `pages/portfolio` on disk: the user-facing word changed, and renaming
 * the folder would rewrite two dozen imports for no behaviour. The route and
 * every visible string are the ones vendors now see.
 */
export default function Portfolio() {
  return (
    <>
      <PageTitle
        title="Photos & Videos"
        subtitle="Show clients your best work from past events. The first one is your cover."
      />
      <VendorGate>{(vendorId) => <PortfolioWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}

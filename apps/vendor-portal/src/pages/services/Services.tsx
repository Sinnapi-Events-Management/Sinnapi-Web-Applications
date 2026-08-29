import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import ServicesWorkspace from './components/organisms/ServicesWorkspace';

/**
 * A vendor's catalogue of services.
 *
 * A SERVICE is what the vendor DOES — photography, catering, decor. A PACKAGE
 * is what it COSTS. That split is the whole shape of this screen: nothing here
 * asks for a price, and every card's "from" figure is derived from the
 * cheapest tier across the service's published packages, through the same
 * `packagePricing` a client reads. The vendor and the market see one number.
 *
 * The page itself is a title and a gate. Everything below it lives in
 * `ServicesWorkspace`, which is mounted only once a vendor id exists — so no
 * hook underneath has to defend against not having one.
 */
export default function Services() {
  return (
    <>
      <PageTitle
        title="Services"
        subtitle="List what you offer. Prices live on the packages you build under each service."
      />
      <VendorGate>{(vendorId) => <ServicesWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}

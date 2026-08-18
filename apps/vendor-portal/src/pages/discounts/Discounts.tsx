import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import DiscountsList from './components/organisms/DiscountsList';

export default function Discounts() {
  return (
    <>
      <PageTitle title="Discounts" subtitle="Discount codes for your clients." />
      <VendorGate>{(vendorId) => <DiscountsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}

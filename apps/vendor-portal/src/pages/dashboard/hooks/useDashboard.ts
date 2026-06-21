import { useVendorContext } from '@/vendor/VendorProvider';
import { useVendorDashboard, useMyApplication } from '@/hooks/queries';

export function useDashboard() {
  const { vendor, subscription, loading } = useVendorContext();
  const dash = useVendorDashboard(vendor?.id);
  const app = useMyApplication();

  return { vendor, subscription, loading, dash, app };
}

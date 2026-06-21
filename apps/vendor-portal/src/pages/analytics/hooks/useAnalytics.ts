import { useVendorDashboard } from '@/hooks/queries';

export function useAnalytics(vendorId: string) {
  const dash = useVendorDashboard(vendorId);

  return { dash };
}

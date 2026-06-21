import { useMyApplication } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';

export function useOnboarding() {
  const { vendor } = useVendorContext();
  const app = useMyApplication();

  return { vendor, app };
}

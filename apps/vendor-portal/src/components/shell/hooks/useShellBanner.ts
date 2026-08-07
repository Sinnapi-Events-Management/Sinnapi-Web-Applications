import { useMemo } from 'react';
import { useVendorContext } from '@/vendor/VendorProvider';
import type { ShellBannerContent } from '../components/ShellBanner';

/** Subscription states that hide the vendor's public listing outright. */
const INACTIVE_STATUSES = ['expired', 'suspended'];

/**
 * The onboarding / subscription notice shown above every vendor page, in
 * priority order: finish the application first, then fix billing. Returns null
 * once the vendor is onboarded and in good standing.
 */
export function useShellBanner(): ShellBannerContent | null {
  const { vendor, subscription, loading } = useVendorContext();

  return useMemo(() => {
    if (loading) return null;

    if (!vendor) {
      return {
        severity: 'info',
        message: 'Complete your vendor application to start receiving bookings.',
        actionLabel: 'Continue',
        actionTo: '/onboarding',
      };
    }

    if (subscription && INACTIVE_STATUSES.includes(subscription.status)) {
      return {
        severity: 'warning',
        message: 'Your subscription is inactive — your public listing is hidden until you renew.',
        actionLabel: 'Renew',
        actionTo: '/subscription',
      };
    }

    if (subscription?.status === 'grace') {
      return {
        severity: 'warning',
        message:
          "Your trial/billing period has ended. You're in the grace period — choose a plan to stay visible.",
        actionLabel: 'Choose a plan',
        actionTo: '/subscription',
      };
    }

    return null;
  }, [loading, vendor, subscription]);
}

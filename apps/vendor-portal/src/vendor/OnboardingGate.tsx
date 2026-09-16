import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@sinnapi/ui';
import { useVendorContext } from '@/vendor/VendorProvider';
import { useOnboardingStatus } from '@/pages/gettingStarted/hooks/useOnboardingStatus';

/** Reachable with an incomplete listing — everything else redirects to the wizard. */
const ALLOWED = ['/getting-started', '/settings', '/subscription', '/payments/return'];

/**
 * Holds a vendor on the onboarding wizard until their listing has what it needs.
 *
 * The public application asks for six fields, so an approved vendor arrives with
 * no category, city, bio, price, coverage or photo — a listing that cannot be
 * found or judged. Rather than let them wander a portal whose pages all depend
 * on that data, they finish setup first.
 *
 * `ALLOWED` is the deliberate escape hatch: settings (to sign out or get help)
 * and subscription (a trial can lapse mid-onboarding, and being unable to pay
 * because you have not written a bio would be absurd) stay reachable.
 *
 * A vendor who has finished once is never sent back: the gate reads
 * `onboarding_completed_at`, not today's field list, so adding a required field
 * later cannot lock existing vendors out of their own portal.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { vendor, loading } = useVendorContext();
  const status = useOnboardingStatus(vendor?.id);
  const location = useLocation();

  // No vendor row yet (an account that was never approved) is not this gate's
  // problem — the shell's own empty state covers it.
  if (loading || !vendor) return <>{children}</>;

  if (status.isLoading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const settled = !!status.vendor?.onboarding_completed_at || status.isComplete;
  const exempt = ALLOWED.some((path) => location.pathname.startsWith(path));

  if (!settled && !exempt) return <Navigate to="/getting-started" replace />;
  return <>{children}</>;
}

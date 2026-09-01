import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { useAnalytics } from './hooks/useAnalytics';
import AnalyticsWorkspace from './components/organisms/AnalyticsWorkspace';
import AnalyticsUpgradeCard from './components/organisms/AnalyticsUpgradeCard';
import AnalyticsPageSkeleton from './components/organisms/AnalyticsPageSkeleton';

/**
 * The vendor's analysis surface.
 *
 * Where the dashboard reports the figures, this reports where they come from —
 * the same reads at the same period, one level deeper, plus the attribution
 * cuts (`vendor_analytics_detail`) that only a paid plan is shown.
 *
 * State, both reads, the derived insights and the export tables all live in
 * `useAnalytics`; layout, tabs and every panel live in the workspace. This
 * stays the wiring point between the two, plus the one branch that decides
 * which of the three surfaces a caller gets.
 */
function AnalyticsView({ vendorId }: { vendorId: string }) {
  const analytics = useAnalytics(vendorId);

  // Resolving the plan. Shaped like the page it precedes so the layout does not
  // jump, and rendered before either branch so we never flash one surface at
  // the other's plan.
  if (analytics.entitlementLoading) return <AnalyticsPageSkeleton />;

  if (!analytics.entitled) return <AnalyticsUpgradeCard />;

  return <AnalyticsWorkspace {...analytics} />;
}

export default function Analytics() {
  return (
    <>
      <PageTitle
        title="Analytics"
        subtitle="What is driving your bookings, your earnings and your reputation."
      />
      <VendorGate>{(vendorId) => <AnalyticsView vendorId={vendorId} />}</VendorGate>
    </>
  );
}

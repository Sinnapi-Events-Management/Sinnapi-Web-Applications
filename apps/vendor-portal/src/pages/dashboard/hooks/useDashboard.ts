import { DEFAULT_PERIOD } from '@sinnapi/ui/analytics';
import { APP } from '@/lib/config';
import { useVendorContext } from '@/vendor/VendorProvider';
import { useMyApplication, useProfile } from '@/hooks/queries';
import { useDocumentSummary } from '@/hooks/documentQueries';
import { useOnboardingStatus } from '@/pages/gettingStarted/hooks/useOnboardingStatus';
import { useVendorOverview } from '../data';
import { useWaitingForYou } from './useWaitingForYou';

/** Time-of-day greeting, so the page opens with a human line rather than a label. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** First name only — "Good morning, Amina" reads better than the full name. */
function firstName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * The dashboard's state: the active period, the single overview read, and the
 * application fallback for an owner who has no vendor record yet. Everything
 * the page renders comes from here, so the components below stay presentational.
 */
/**
 * Everything the redesigned dashboard (2026-11-17) shows: quick actions, the
 * people waiting, the next job, the money, and listing strength. The period
 * picker and the Earnings / Bookings / Reputation panels moved to Analytics.
 */
export function useDashboard() {
  const { vendor, subscription, loading } = useVendorContext();
  const { data: profile } = useProfile();
  const overview = useVendorOverview(vendor?.id, DEFAULT_PERIOD);
  const application = useMyApplication();
  const waiting = useWaitingForYou(vendor?.id);
  const docs = useDocumentSummary(vendor?.id);
  const listing = useOnboardingStatus(vendor?.id);

  const name = firstName(profile?.full_name) ?? vendor?.business_name;
  const ugx = docs.data?.find((r) => r.currency === 'UGX');

  return {
    vendor,
    subscription,
    loading,
    application,
    title: name ? `${greeting()}, ${name}` : greeting(),
    publicUrl: vendor ? `${APP.publicUrl.replace(/\/$/, '')}/vendors/${vendor.slug}` : '',
    waiting,
    upcoming: overview.data?.upcoming ?? [],
    earnings: overview.data?.earnings,
    owed: docs.data && docs.data.length > 0 ? Number(ugx?.outstanding ?? 0) : null,
    overviewLoading: overview.isLoading,
    overviewError: overview.error,
    listingPercent: listing.percent,
    listingTip: listing.nextListingTip,
    listingLoading: listing.isLoading,
  };
}

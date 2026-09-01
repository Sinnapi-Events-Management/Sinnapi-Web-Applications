import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PERIOD, getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { useVendorContext } from '@/vendor/VendorProvider';
import { useMyApplication, useProfile } from '@/hooks/queries';
import { useVendorOverview } from '../data';
import { useDashboardTabs } from './useDashboardTabs';

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
export function useDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_PERIOD);
  const { vendor, subscription, loading } = useVendorContext();
  const { tabs, tab, activeTab, setTab } = useDashboardTabs();
  const queryClient = useQueryClient();

  const { data: profile } = useProfile();
  const { data, isLoading, isFetching, error, refetch } = useVendorOverview(vendor?.id, period);
  // Only asked for when there is no vendor yet — that branch is the entire
  // reason to fetch it, and an approved vendor should not pay for the request.
  const application = useMyApplication();

  const name = firstName(profile?.full_name) ?? vendor?.business_name;
  // Badged on the Overview tab so a backlog stays visible from the analytics
  // tabs. Escrow and payouts are excluded: money in flight is being handled by
  // someone else, and badging it would cry wolf every time a vendor gets paid.
  const attentionCount = (data?.queues ?? [])
    .filter((q) => q.key !== 'escrow' && q.key !== 'payouts')
    .reduce((acc, q) => acc + q.count, 0);

  return {
    vendor,
    subscription,
    /** True while the vendor record itself is resolving — before this, nothing renders. */
    loading,
    application,
    period,
    setPeriod,
    tabs,
    tab,
    activeTab,
    setTab,
    attentionCount,
    periodLabel: getPeriodOption(period).longLabel,
    title: name ? `${greeting()}, ${name}` : greeting(),
    data,
    isLoading,
    /** True during a background refresh, when stale data is still on screen. */
    isRefreshing: isFetching && !isLoading,
    error,
    refresh: () => {
      // Drop the whole dashboard key so switching period after a refresh can't
      // resolve from a cache entry that predates it.
      queryClient.invalidateQueries({ queryKey: ['v-dashboard'] });
      return refetch();
    },
  };
}

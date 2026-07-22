import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/queries';
import { DEFAULT_PERIOD, getPeriodOption, type AnalyticsPeriod } from '@/lib/analytics';
import { useDashboardOverview } from '../data';
import { useDashboardSections } from './useDashboardSections';
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
 * The dashboard's state: the active period, the single overview read, and which
 * sections this admin may see. Everything the page renders comes from here, so
 * the components below stay presentational.
 */
export function useDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_PERIOD);
  const sections = useDashboardSections();
  const { tabs, tab, activeTab, setTab } = useDashboardTabs(sections.canSee);
  const queryClient = useQueryClient();

  const { data: profile } = useProfile();
  const { data, isLoading, isFetching, error, refetch } = useDashboardOverview(period);

  const name = firstName(profile?.full_name);
  // Badged on the Overview tab so a backlog is visible from the analytics tabs.
  const attentionCount = (data?.queues ?? []).reduce((acc, q) => acc + q.count, 0);

  return {
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
      // resolve from a cache entry that predates the refresh.
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      return refetch();
    },
    ...sections,
  };
}

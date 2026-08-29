import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PERIOD, getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { useVendorOverview } from '@/data/overview';
import { useVendorContext } from '@/vendor/VendorProvider';
import { usePlanFeature } from '@/hooks/usePlanFeature';
import { useVendorAnalytics } from '../data';
import { buildInsights, buildTables } from '../schema';
import { useAnalyticsTabs } from './useAnalyticsTabs';
import { useAnalyticsExport } from './useAnalyticsExport';

/**
 * Everything the Analytics page knows: the entitlement, the active window, the
 * two reads behind it, the derived insights and export tables, and which panel
 * is showing. The components below are presentational.
 *
 * The two reads are deliberate. `useVendorOverview` is the dashboard's own
 * payload at the same period, so a figure can never differ between the two
 * pages; `useVendorAnalytics` adds the attribution and behaviour cuts that only
 * this page shows. Both are gated on the same entitlement and skipped entirely
 * without it — an unentitled vendor should not pay for a payload they will not
 * be shown.
 */
export function useAnalytics(vendorId: string) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_PERIOD);
  const queryClient = useQueryClient();
  const { vendor } = useVendorContext();
  const { tabs, tab, activeTab, setTab } = useAnalyticsTabs();

  // Detailed analytics is a Professional/Elite entitlement (`plan_features`).
  const { enabled, loading: entitlementLoading } = usePlanFeature('client_analytics');
  const gatedId = enabled ? vendorId : undefined;

  const overview = useVendorOverview(gatedId, period);
  const detail = useVendorAnalytics(gatedId, period);

  // One insight set for the page, not per panel: the finding that matters most
  // is rarely on the tab a vendor happens to have open.
  const insights = useMemo(
    () => buildInsights(overview.data, detail.data),
    [overview.data, detail.data],
  );

  const tables = useMemo(
    () => buildTables(overview.data, detail.data),
    [overview.data, detail.data],
  );

  const exportTables = useAnalyticsExport(period, vendor?.business_name);

  // Loading is either read's first fetch; refreshing is either read in flight
  // while data is already on screen. Treated as one state on purpose — two
  // independent spinners on one page would read as two half-loaded pages.
  const isLoading = overview.isLoading || detail.isLoading;
  const isRefreshing = (overview.isFetching || detail.isFetching) && !isLoading;

  return {
    entitled: enabled,
    entitlementLoading,

    period,
    setPeriod,
    periodLabel: getPeriodOption(period).longLabel,

    tabs,
    tab,
    activeTab,
    setTab,

    overview: overview.data,
    detail: detail.data,
    insights,
    /** Export-ready tables for the active panel, plus every panel's set. */
    tables,
    exportTables,

    isLoading,
    isRefreshing,
    // Whichever read failed first. The page shows one error, because a vendor
    // cannot act differently on "the overview failed" and "the detail failed".
    error: overview.error ?? detail.error,

    refresh: () => {
      // Drop both keys so switching period after a refresh cannot resolve from
      // a cache entry that predates it.
      queryClient.invalidateQueries({ queryKey: ['v-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['v-analytics'] });
      return Promise.all([overview.refetch(), detail.refetch()]);
    },
  };
}

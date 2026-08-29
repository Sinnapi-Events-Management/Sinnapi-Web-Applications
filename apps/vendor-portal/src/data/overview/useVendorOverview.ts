import { useQuery } from '@tanstack/react-query';
import { getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { supabase } from '@/lib/supabase';
import { toDashboardModel } from './presenter';
import type { DashboardModel, VendorOverviewRow } from './types';

async function load(vendorId: string, period: AnalyticsPeriod): Promise<DashboardModel> {
  const { days, unit, longLabel } = getPeriodOption(period);
  const { data, error } = await supabase.rpc('vendor_dashboard_overview', {
    p_vendor_id: vendorId,
    p_days: days,
    p_granularity: unit,
  });
  if (error) throw error;
  // The RPC always returns an object, but a null here would fail deep inside the
  // presenter with a far less useful message than this one.
  if (!data) throw new Error('The dashboard returned no data.');
  return toDashboardModel(data as VendorOverviewRow, longLabel);
}

/**
 * The dashboard's single read. `vendor_dashboard_overview` aggregates every
 * queue, money figure, trend and diary entry server-side behind one
 * `is_vendor_owner` check, so the whole page is one round-trip instead of the
 * five head-counts and three list queries it would otherwise take.
 */
export function useVendorOverview(vendorId: string | undefined, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['v-dashboard', vendorId, period],
    enabled: !!vendorId,
    queryFn: () => load(vendorId!, period),
    // Operational figures, not live-critical: a minute of staleness keeps period
    // switching instant without ever showing a visibly old backlog.
    staleTime: 60_000,
  });
}

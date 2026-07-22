import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getPeriodOption, type AnalyticsPeriod } from '@/lib/analytics';
import { toDashboardModel, type DashboardModel, type DashboardOverviewRow } from '../schema';

async function load(period: AnalyticsPeriod): Promise<DashboardModel> {
  const { days, unit, longLabel } = getPeriodOption(period);
  const { data, error } = await supabase.rpc('admin_dashboard_overview', {
    p_days: days,
    p_granularity: unit,
  });
  if (error) throw error;
  // The RPC always returns an object, but a null here would fail deep inside the
  // presenter with a far less useful message than this one.
  if (!data) throw new Error('The dashboard returned no data.');
  return toDashboardModel(data as DashboardOverviewRow, longLabel);
}

/**
 * The dashboard's single read. `admin_dashboard_overview` aggregates every
 * queue, trend and distribution server-side and omits whatever the caller lacks
 * permission for, so the whole page is one round-trip and the client never has
 * to decide what it is allowed to see.
 */
export function useDashboardOverview(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['admin-dashboard', period],
    queryFn: () => load(period),
    // The figures are operational, not live-critical: a minute of staleness
    // keeps period switching instant without serving a visibly old backlog.
    staleTime: 60_000,
  });
}

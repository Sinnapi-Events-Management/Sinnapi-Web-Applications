import { useQuery } from '@tanstack/react-query';
import { getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { supabase } from '@/lib/supabase';
import { toAnalyticsModel, type AnalyticsModel, type VendorAnalyticsRow } from '../schema';

async function load(vendorId: string, period: AnalyticsPeriod): Promise<AnalyticsModel> {
  const { days } = getPeriodOption(period);
  const { data, error } = await supabase.rpc('vendor_analytics_detail', {
    p_vendor_id: vendorId,
    p_days: days,
  });
  if (error) throw error;
  // The RPC always returns an object, but a null here would fail deep inside
  // the presenter with a far less useful message than this one.
  if (!data) throw new Error('Analytics returned no data.');
  return toAnalyticsModel(data as VendorAnalyticsRow);
}

/**
 * The Analytics page's second read: the attribution and behaviour cuts that the
 * landing dashboard deliberately does not pay for.
 *
 * Kept separate from `useVendorOverview` rather than merged into it because the
 * two have different audiences — every vendor loads the overview, only an
 * entitled one loads this — and different costs, since several of these
 * aggregates scan lifetime history rather than the window. Both are keyed on
 * the same period, so the page never mixes two windows on one screen.
 *
 * `enabled` carries the entitlement: an unentitled vendor never issues the
 * request at all, so a paid payload is not fetched and then hidden in the DOM.
 */
export function useVendorAnalytics(vendorId: string | undefined, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['v-analytics', vendorId, period],
    enabled: !!vendorId,
    queryFn: () => load(vendorId!, period),
    // Matches the overview's staleness so switching period is instant on both
    // reads and the two can never resolve from caches of different ages.
    staleTime: 60_000,
  });
}

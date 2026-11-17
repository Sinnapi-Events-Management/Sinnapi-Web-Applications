import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, StatusTabs } from '@sinnapi/ui';
import { DEFAULT_PERIOD, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { MetricsToolbar } from '@/components/metrics';
import { useVendorOverview } from '@/data/overview';
import EarningsSection from './EarningsSection';
import BookingsSection from './BookingsSection';
import ReputationSection from './ReputationSection';

type Panel = 'earnings' | 'bookings' | 'reputation';

const PANELS: { value: Panel; label: string }[] = [
  { value: 'earnings', label: 'Money' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'reputation', label: 'Reviews' },
];

/**
 * The free part of Analytics: the period picker and the Money / Bookings /
 * Reviews panels that used to sit on the dashboard. Moved here on 2026-11-17
 * so the dashboard leads with what to do; kept free for every plan so vendors
 * on lower plans did not lose numbers they already had.
 */
export default function BusinessSnapshot({ vendorId }: { vendorId: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_PERIOD);
  const [panel, setPanel] = useState<Panel>('earnings');
  const qc = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useVendorOverview(vendorId, period);

  return (
    <Box sx={{ mb: 4 }}>
      <MetricsToolbar
        period={period}
        onPeriodChange={setPeriod}
        generatedAt={data?.generatedAt}
        isRefreshing={isFetching && !isLoading}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ['v-dashboard'] });
          void refetch();
        }}
        surfaceLabel="Analytics"
      />
      <StatusTabs<Panel>
        options={PANELS}
        value={panel}
        onChange={setPanel}
        ariaLabel="Your business numbers"
      />
      {error ? (
        <Alert severity="error">Your numbers could not load. Try again in a moment.</Alert>
      ) : (
        <>
          {panel === 'earnings' && (
            <EarningsSection earnings={data?.earnings} loading={isLoading} />
          )}
          {panel === 'bookings' && (
            <BookingsSection pipeline={data?.pipeline} loading={isLoading} />
          )}
          {panel === 'reputation' && (
            <ReputationSection reputation={data?.reputation} loading={isLoading} />
          )}
        </>
      )}
    </Box>
  );
}

import { Box } from '@sinnapi/ui';
import { KpiRow, type Kpi } from '@sinnapi/ui/analytics';

/**
 * What the campaigns are adding up to, above the grid that lists them.
 *
 * The shared analytics kit rather than a set of tiles written here, so a figure
 * on this page is rendered by the same component as a figure on the dashboard —
 * one place to change how a metric reads, and no chance of two portals
 * formatting the same count differently.
 *
 * Hidden entirely when the vendor has no campaigns — four zeroes above an empty
 * state is a worse first screen than the empty state on its own — which also
 * covers the first load, when the grid below is already showing a spinner and a
 * row of skeleton tiles above it would be noise.
 *
 * `loading` tracks the *codes* read rather than the campaigns one. Two of these
 * four figures are counted from discount rows, and a vendor whose campaign has
 * forty redemptions must not be shown a confident zero for the moment that
 * query is still in flight.
 */
export default function PromotionsMetrics({
  kpis,
  loading,
  hidden,
}: {
  kpis: Kpi[];
  loading: boolean;
  hidden: boolean;
}) {
  if (hidden) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <KpiRow kpis={kpis} loading={loading} />
    </Box>
  );
}

import { Box } from '@sinnapi/ui';
import { KpiRow, type Kpi } from '@sinnapi/ui/analytics';

/**
 * What the codes are adding up to, above the grid that lists them.
 *
 * The shared analytics kit rather than a set of tiles written here, so a figure
 * on this page is rendered by the same component as a figure on the dashboard —
 * one place to change how a metric reads, and no chance of two portals
 * formatting the same count differently.
 *
 * Hidden entirely when the vendor has no codes — four zeroes above an empty
 * state is a worse first screen than the empty state on its own — which also
 * covers the first load, when the grid below is already showing a spinner and a
 * row of skeleton tiles above it would be noise.
 *
 * Every figure here is counted from rows this page already holds, so there is
 * no separate loading state to track: if the tiles are drawn, they are right.
 */
export default function DiscountsMetrics({ kpis, hidden }: { kpis: Kpi[]; hidden: boolean }) {
  if (hidden) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <KpiRow kpis={kpis} />
    </Box>
  );
}

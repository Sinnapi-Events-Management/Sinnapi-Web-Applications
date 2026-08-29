import { Box, Grid, Skeleton } from '@sinnapi/ui';
import type { Insight } from '../../schema';
import InsightCard from '../molecules/InsightCard';

type Props = {
  insights: Insight[];
  loading: boolean;
};

/**
 * What the page found, above the tabs.
 *
 * Page-level rather than per-panel on purpose: the finding that matters most is
 * rarely on the tab a vendor happens to have open, and a vendor who never
 * leaves the first panel should still be told that three reviews are waiting.
 *
 * Renders nothing at all when there is nothing to say. A strip of "everything
 * looks fine" cards would occupy the most valuable space on the page to convey
 * no information, and would make the strip easy to stop reading on the day it
 * does carry something.
 */
export default function InsightStrip({ insights, loading }: Props) {
  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid key={i} item xs={12} sm={6} lg={4}>
            <Skeleton variant="rounded" height={128} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!insights.length) return null;

  return (
    <Box component="section" aria-label="What your numbers say" sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {insights.map((insight) => (
          // Two-up from `sm` and three-up from `lg` rather than four: these are
          // sentences, not tiles, and a quarter-width column would wrap every
          // headline onto three lines.
          <Grid key={insight.key} item xs={12} sm={6} lg={4}>
            <InsightCard insight={insight} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

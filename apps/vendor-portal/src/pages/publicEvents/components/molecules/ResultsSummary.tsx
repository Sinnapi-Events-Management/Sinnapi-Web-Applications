import { Box, Stack, Typography, CircularProgress } from '@sinnapi/ui';

type ResultsSummaryProps = {
  total: number;
  isRefreshing: boolean;
  /** Whether a search term or a facet is narrowing the feed. */
  isFiltered: boolean;
};

/**
 * The count line above the feed.
 *
 * The foot of the list already carries "showing N of M", but that is the answer
 * to "have I reached the end" and it arrives after an infinite scroll. This is
 * the answer to "did my filter do anything", and it has to sit where the filter
 * controls are or it answers nothing. It is also where the refreshing state is
 * *stated* rather than implied: the grid dims while new results land, and a
 * dimmed grid with no caption reads as a bug on a slow connection.
 *
 * The rule is aligned to the divider that separates the controls from the
 * results — the count reads as a label on the feed rather than a fourth line
 * of toolbar.
 */
export default function ResultsSummary({ total, isRefreshing, isFiltered }: ResultsSummaryProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ mb: 2, minHeight: 28, color: 'text.secondary' }}
    >
      <Typography variant="body2" aria-live="polite">
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {total}
        </Box>{' '}
        {total === 1 ? 'event' : 'events'}
        {isFiltered ? ' match your filters' : ' open to vendors'}
      </Typography>

      {isRefreshing && (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <CircularProgress size={13} color="inherit" />
          <Typography variant="caption">Updating…</Typography>
        </Stack>
      )}
    </Stack>
  );
}

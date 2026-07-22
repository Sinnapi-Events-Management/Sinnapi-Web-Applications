import { Box, Skeleton, Stack, Typography, useTheme } from '@sinnapi/ui';
import type { BreakdownSlice } from '@/lib/analytics';

type Props = {
  data: BreakdownSlice[];
  loading?: boolean;
  emptyLabel?: string;
};

/**
 * Part-to-whole as a horizontal stacked bar with a labelled legend.
 *
 * Preferred over a donut for lifecycle/status distributions: those run to seven
 * or more classes, past the point where arcs stay distinguishable, and their
 * names are long enough that a ring's side legend gets squeezed. A horizontal
 * bar also scales down to a narrow column without shrinking the mark.
 *
 * Segments are separated by a 2px surface gap rather than a border, so the gap
 * reads as space instead of adding a competing line to every edge.
 */
export default function StackedShareBar({
  data,
  loading,
  emptyLabel = 'No data for this period.',
}: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={14} sx={{ borderRadius: 7 }} />
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={20} />
          ))}
        </Stack>
      </Box>
    );
  }

  const total = data.reduce((acc, s) => acc + s.value, 0);

  if (!data.length || total === 0) {
    return (
      <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="h4" sx={{ lineHeight: 1 }}>
          {total.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          total
        </Typography>
      </Stack>

      <Box
        sx={{ display: 'flex', gap: '2px', height: 14, borderRadius: 7, overflow: 'hidden' }}
        role="img"
        aria-label={data.map((s) => `${s.name}: ${s.value}`).join(', ')}
      >
        {data.map((slice) => (
          <Box
            key={slice.name}
            sx={{
              // flexGrow carries the proportion; flexBasis 0 keeps the 2px gaps
              // from distorting narrow segments.
              flexGrow: slice.value,
              flexBasis: 0,
              minWidth: 3,
              bgcolor: theme.palette[slice.color].main,
            }}
          />
        ))}
      </Box>

      <Stack spacing={0.75} sx={{ mt: 2 }}>
        {data.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <Box key={slice.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: theme.palette[slice.color].main,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {slice.name}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {slice.value.toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              >
                {pct}%
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

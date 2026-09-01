import { Box, LinearProgress, Skeleton, Stack, Typography } from '@sinnapi/ui';
import type { RankedItem } from '../../schema';

type Props = {
  items: RankedItem[];
  loading?: boolean;
  /** Shown in place of the list when there is nothing to rank. */
  emptyMessage: string;
  /** Placeholder rows before the first payload. */
  skeletonCount?: number;
};

function Row({ item }: { item: RankedItem }) {
  return (
    <Box sx={{ py: 1.25 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            minWidth: 0,
            // Long service and package names are the norm here, and a wrapped
            // one would break the row rhythm the bars depend on.
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.name}
        >
          {item.name}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          {item.value}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.round(item.share * 100))}
        color="secondary"
        sx={{ height: 6, borderRadius: 3, my: 0.75 }}
        aria-hidden
      />

      {/* "of those shown" rather than "of total": this is a top-N list, so a
          share against the vendor's grand total would be a different number
          from the one these bars actually draw. */}
      <Typography variant="caption" color="text.secondary">
        {item.meta} · {Math.round(item.share * 100)}% of those shown
      </Typography>
    </Box>
  );
}

/**
 * A ranked breakdown as rows with inline share bars.
 *
 * Rows rather than a donut because these lists carry two figures per entry (a
 * value and a supporting count) and long, human-authored names — a ring would
 * push both into a legend, and the names would be truncated there instead of
 * where the reader is looking. Bars are decorative to a screen reader; the
 * share is stated in the caption text, which is read aloud.
 */
export default function RankedList({ items, loading, emptyMessage, skeletonCount = 4 }: Props) {
  if (loading) {
    return (
      <Stack spacing={2} sx={{ py: 1 }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Box key={i}>
            <Skeleton variant="text" width="65%" />
            <Skeleton variant="rounded" height={6} sx={{ my: 0.75 }} />
            <Skeleton variant="text" width="40%" height={14} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (!items.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack sx={{ py: 0.5 }}>
      {items.map((item) => (
        <Row key={item.key} item={item} />
      ))}
    </Stack>
  );
}

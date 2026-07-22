import type { ReactElement } from 'react';
import { Box, Skeleton, Typography } from '@sinnapi/ui';
import { ResponsiveContainer } from 'recharts';

type Props = {
  loading?: boolean;
  /** Show the empty message instead of the chart (no data for the period). */
  empty?: boolean;
  emptyLabel?: string;
  height?: number;
  /** A single recharts chart element (ResponsiveContainer requires one child). */
  children: ReactElement;
};

/**
 * Fixed-height wrapper that owns the loading skeleton, the empty state and the
 * `ResponsiveContainer` sizing — so individual chart molecules only describe the
 * chart itself and every card lines up to the same height.
 */
export default function ChartFrame({
  loading,
  empty,
  emptyLabel = 'No data for this period.',
  height = 280,
  children,
}: Props) {
  if (loading) return <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />;

  if (empty) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </Box>
  );
}

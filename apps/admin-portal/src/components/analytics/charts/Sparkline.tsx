import { Box, Skeleton, useTheme } from '@sinnapi/ui';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { SeriesColor, TrendPoint } from '@/lib/analytics';

type Props = {
  data: TrendPoint[];
  /** Which numeric key of each point to draw. */
  dataKey: string;
  color?: SeriesColor;
  height?: number;
  loading?: boolean;
};

/**
 * Axis-less, label-less micro-chart for inline trend context inside a tile.
 * It answers "which way is this heading?", not "what is the value?" — the tile's
 * own number carries the magnitude — so it drops every chrome a full chart has.
 * Renders nothing when there is no shape to show, letting the tile collapse.
 */
export default function Sparkline({
  data,
  dataKey,
  color = 'primary',
  height = 44,
  loading,
}: Props) {
  const theme = useTheme();
  const stroke = theme.palette[color].main;
  const gradientId = `spark-${color}-${dataKey}`;

  if (loading) return <Skeleton variant="rounded" height={height} />;
  // A single point has no trend to read, and a flat zero series is just noise.
  if (data.length < 2 || data.every((d) => !Number(d[dataKey]))) return null;

  return (
    <Box sx={{ height, width: '100%' }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

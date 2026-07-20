import { Box, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { BreakdownSlice } from '../../../schema';
import ChartTooltip from './ChartTooltip';
import { useChartTokens } from './chartTokens';

type Props = {
  data: BreakdownSlice[];
  loading?: boolean;
  height?: number;
};

/**
 * Donut distribution with a side legend that also carries each slice's count and
 * share. Owns its own loading/empty states (the legend sits outside the chart,
 * so it can't reuse `ChartFrame`'s single-child `ResponsiveContainer`).
 */
export default function BreakdownDonut({ data, loading, height = 280 }: Props) {
  const { colorOf } = useChartTokens();

  if (loading) return <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />;

  if (!data.length) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data for this period.
        </Typography>
      </Box>
    );
  }

  const total = data.reduce((acc, s) => acc + s.value, 0);
  const chartData = data.map((s) => ({ name: s.name, value: s.value, fill: colorOf(s.color) }));

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{ position: 'relative', width: { xs: '100%', sm: 200 }, height: 200, flexShrink: 0 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((slice) => (
                <Cell key={slice.name} fill={slice.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormat="number" />} />
          </PieChart>
        </ResponsiveContainer>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ lineHeight: 1 }}>
              {total.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {data.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <Box key={slice.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: colorOf(slice.color),
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {slice.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {slice.value.toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 36, textAlign: 'right' }}
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

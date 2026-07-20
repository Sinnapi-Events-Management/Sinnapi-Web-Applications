import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesDef, TrendPoint, ValueFormat } from '../../../schema';
import { formatCompact } from '../../../format';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { useChartTokens } from './chartTokens';

type Props = {
  data: TrendPoint[];
  series: SeriesDef[];
  valueFormat?: ValueFormat;
  loading?: boolean;
  height?: number;
  /** Render a legend when more than one series is present. */
  legend?: boolean;
};

/** Reusable grouped/single bar chart with rounded bars. */
export default function GroupedBarChart({
  data,
  series,
  valueFormat = 'number',
  loading,
  height,
  legend,
}: Props) {
  const t = useChartTokens();

  return (
    <ChartFrame loading={loading} empty={!data.length} height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: t.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: t.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => formatCompact(v, valueFormat)}
        />
        <Tooltip
          cursor={{ fill: t.grid, opacity: 0.4 }}
          content={<ChartTooltip valueFormat={valueFormat} />}
        />
        {legend && <Legend wrapperStyle={{ fontSize: 12, color: t.axis }} iconType="circle" />}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={t.colorOf(s.color)}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

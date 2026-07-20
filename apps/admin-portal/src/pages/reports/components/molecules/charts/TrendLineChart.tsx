import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
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
  legend?: boolean;
};

/** Reusable multi-series line chart for rates/comparisons over time. */
export default function TrendLineChart({
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
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
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
        <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
        {legend && <Legend wrapperStyle={{ fontSize: 12, color: t.axis }} iconType="circle" />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={t.colorOf(s.color)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

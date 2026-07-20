import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
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
};

/** Reusable multi-series area chart with soft gradient fills. */
export default function TrendAreaChart({
  data,
  series,
  valueFormat = 'number',
  loading,
  height,
}: Props) {
  const t = useChartTokens();

  return (
    <ChartFrame loading={loading} empty={!data.length} height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.colorOf(s.color)} stopOpacity={0.35} />
              <stop offset="100%" stopColor={t.colorOf(s.color)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
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
          width={48}
          tickFormatter={(v: number) => formatCompact(v, valueFormat)}
        />
        <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={t.colorOf(s.color)}
            strokeWidth={2}
            fill={`url(#area-${s.key})`}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

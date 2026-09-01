// Analytics kit — the shared measurement surface for every Sinnapi portal.
//
// Two halves. `core` is the vocabulary: the value formats, reporting windows,
// formatters and slice builders a metric is described in. The components are the
// three altitudes a metric is read at — a hero figure, a row of KPI tiles, and
// the charts behind them.
//
// Lives outside the root barrel because the charts depend on `recharts`, which
// only the SPA portals install — the Next.js `web-public` app must never pull it
// into its module graph. Import from `@sinnapi/ui/analytics`.
export * from './core';

export { default as ChartCard } from './molecules/ChartCard';
export { default as HeroStat } from './molecules/HeroStat';
export { default as KpiRow } from './molecules/KpiRow';
export { default as KpiTile } from './molecules/KpiTile';
export { default as PeriodSelector } from './molecules/PeriodSelector';
export { default as StackedShareBar } from './molecules/StackedShareBar';
export { default as TrendBadge } from './molecules/TrendBadge';

export { default as BreakdownDonut } from './charts/BreakdownDonut';
export { default as ChartFrame } from './charts/ChartFrame';
export { default as ChartTooltip } from './charts/ChartTooltip';
export { default as GroupedBarChart } from './charts/GroupedBarChart';
export { default as Sparkline } from './charts/Sparkline';
export { default as TrendAreaChart } from './charts/TrendAreaChart';
export { default as TrendLineChart } from './charts/TrendLineChart';
export { useChartTokens } from './charts/chartTokens';

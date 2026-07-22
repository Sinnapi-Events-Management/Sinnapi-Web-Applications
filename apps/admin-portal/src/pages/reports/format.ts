// Report value formatting is the shared analytics formatting — re-exported so
// the report data hooks keep their existing `../format` import path.
export {
  bucketLabel,
  compactMoney,
  formatCompact,
  formatDelta,
  formatValue,
  seriesDelta,
  sumSeries,
} from '@/lib/analytics';

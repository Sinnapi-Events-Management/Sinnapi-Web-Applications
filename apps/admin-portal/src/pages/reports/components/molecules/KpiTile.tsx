import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@sinnapi/ui';
import type { Kpi } from '../../schema';
import { formatValue } from '../../format';
import TrendBadge from './TrendBadge';

type Props = {
  kpi: Kpi;
  loading?: boolean;
  /** Caption under the delta, e.g. the comparison window. */
  comparisonLabel?: string;
};

/**
 * Headline metric card: overline label, large formatted value and — when a
 * comparison exists — a coloured trend delta. Reused across all four report
 * panels so KPIs read identically everywhere.
 */
export default function KpiTile({ kpi, loading, comparisonLabel }: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.4 }}
        >
          {kpi.label}
        </Typography>

        {loading ? (
          <Skeleton variant="text" width="70%" height={44} />
        ) : (
          <Typography variant="h3" sx={{ fontSize: '1.9rem', lineHeight: 1.2, mt: 0.25 }}>
            {formatValue(kpi.value, kpi.format)}
          </Typography>
        )}

        {!loading && kpi.delta !== null && (
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
            <TrendBadge delta={kpi.delta} invert={kpi.invertDelta} />
            {comparisonLabel && (
              <Typography variant="caption" color="text.secondary">
                {comparisonLabel}
              </Typography>
            )}
          </Stack>
        )}

        {!loading && kpi.delta === null && (
          <Box sx={{ mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Live total
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

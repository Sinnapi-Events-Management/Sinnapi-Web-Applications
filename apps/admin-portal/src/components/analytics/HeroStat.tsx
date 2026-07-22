import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { formatValue, type TrendPoint, type ValueFormat } from '@/lib/analytics';
import IconBadge from '@/components/ui/IconBadge';
import TrendBadge from './TrendBadge';
import Sparkline from './charts/Sparkline';

type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  label: string;
  value: number;
  format: ValueFormat;
  /** Fractional change over the window; null hides the badge. */
  delta?: number | null;
  comparisonLabel?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /** Optional context series drawn behind the figure. */
  trend?: TrendPoint[];
  trendKey?: string;
  /** Secondary facts, e.g. "412 active · 3 at risk". */
  caption?: string;
  loading?: boolean;
};

/**
 * The one number a screen leads with, at display size.
 *
 * Distinct from `KpiTile` on purpose: a KPI row is a set of peers, whereas this
 * asserts a single primary metric. Sizing it like the tiles beside it would
 * flatten exactly the hierarchy it exists to create, so the figure is roughly
 * double and it owns its own card.
 */
export default function HeroStat({
  label,
  value,
  format,
  delta,
  comparisonLabel,
  icon,
  accent = 'success',
  trend,
  trendKey,
  caption,
  loading,
}: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          {icon && <IconBadge accent={accent}>{icon}</IconBadge>}
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {label}
          </Typography>
        </Stack>

        {loading ? (
          <Skeleton variant="text" width="70%" height={64} />
        ) : (
          <Typography
            variant="h1"
            sx={{
              // Proportional figures: tabular digits read loose at display size.
              fontSize: { xs: '2.5rem', sm: '3rem' },
              lineHeight: 1.05,
              fontVariantNumeric: 'normal',
            }}
          >
            {formatValue(value, format)}
          </Typography>
        )}

        {!loading && (
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1 }} useFlexGap>
            {delta !== null && delta !== undefined && <TrendBadge delta={delta} />}
            {comparisonLabel && (
              <Typography variant="caption" color="text.secondary">
                {comparisonLabel}
              </Typography>
            )}
          </Stack>
        )}

        {!loading && caption && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {caption}
          </Typography>
        )}

        {trend && trendKey && (
          <Box sx={{ mt: 2 }}>
            <Sparkline data={trend} dataKey={trendKey} color={accent} height={56} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

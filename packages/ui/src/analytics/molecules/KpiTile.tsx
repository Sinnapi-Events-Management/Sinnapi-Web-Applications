'use client';
import { Box, Card, CardContent, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { formatValue, type Kpi } from '../core';
import TrendBadge from './TrendBadge';

type Props = {
  kpi: Kpi;
  loading?: boolean;
  /** Caption under the delta, naming the comparison window. */
  comparisonLabel?: string;
  /** Tooltip on that caption, spelling the comparison out in a sentence. */
  comparisonHint?: string;
};

/**
 * Headline metric card: overline label, large formatted value and — when a
 * comparison exists — a coloured trend delta. Reused across all four report
 * panels so KPIs read identically everywhere.
 *
 * The caption is deliberately explainable: "vs first half" alone has been read
 * as "against the previous period", so where the row supplies a hint the caption
 * carries it as a tooltip (and a dotted underline to say one is there).
 */
export default function KpiTile({ kpi, loading, comparisonLabel, comparisonHint }: Props) {
  // A tile may name its own comparison, for rows that mix two of them.
  const label = kpi.comparisonLabel ?? comparisonLabel;
  const hint = kpi.comparisonLabel ? kpi.comparisonHint : (kpi.comparisonHint ?? comparisonHint);

  const caption = label ? (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={hint ? { borderBottom: '1px dotted', borderColor: 'divider', cursor: 'help' } : undefined}
    >
      {label}
    </Typography>
  ) : null;

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
            {caption &&
              (hint ? (
                <Tooltip title={hint} enterTouchDelay={0} arrow>
                  {caption}
                </Tooltip>
              ) : (
                caption
              ))}
          </Stack>
        )}

        {/* No delta is not the same as no comparison being possible, so the tile
            says only what its caller declared and otherwise stays silent rather
            than captioning a window total as a live balance. */}
        {!loading && kpi.delta === null && kpi.noDeltaLabel && (
          <Box sx={{ mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {kpi.noDeltaLabel}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

import { Box, Typography } from '@sinnapi/ui';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { formatDelta } from '../../format';

type Props = {
  /** Fractional change (0.12 = +12%). */
  delta: number;
  /** When true, a decrease is the good outcome (churn, refunds, disputes). */
  invert?: boolean;
};

/**
 * Signed change pill with a direction arrow, coloured green/red by whether the
 * movement is *good* — so an upward churn reads red while upward revenue reads
 * green. Presentational; the caller decides polarity via `invert`.
 */
export default function TrendBadge({ delta, invert }: Props) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  const color = good ? 'success.main' : 'error.main';
  const Icon = up ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color }}>
      <Icon sx={{ fontSize: 15 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>
        {formatDelta(delta)}
      </Typography>
    </Box>
  );
}

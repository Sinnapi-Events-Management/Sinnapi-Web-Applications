import { Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';

type Props = {
  used: number;
  /** The plan's image cap. Null means unlimited — nothing is drawn. */
  limit: number | null;
  planName: string | null;
};

/**
 * How much of the plan's image allowance is gone.
 *
 * Rendered only when there is a cap to show: an unlimited plan gets no meter at
 * all, because a bar that can never fill is noise. It turns warning-coloured
 * before it is full rather than at the moment of failure — the point is to be
 * seen while there is still time to upgrade or prune, not to explain a refusal
 * after the fact.
 */
export default function PlanUsageMeter({ used, limit, planName }: Props) {
  if (limit === null) return null;

  const ratio = limit === 0 ? 1 : Math.min(1, used / limit);
  const isFull = used >= limit;
  const isNearlyFull = !isFull && ratio >= 0.8;
  const color = isFull ? 'error' : isNearlyFull ? 'warning' : 'primary';

  return (
    <Box sx={{ minWidth: { xs: '100%', sm: 190 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {planName ? `${planName} plan` : 'Photo allowance'}
        </Typography>
        <Typography
          variant="caption"
          fontWeight={700}
          color={isFull ? 'error.main' : 'text.primary'}
        >
          {used} / {limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={ratio * 100}
        color={color}
        aria-label={`${used} of ${limit} photos used`}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

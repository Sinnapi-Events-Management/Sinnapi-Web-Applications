import { Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';

type Props = { percent: number };

/**
 * How much of the listing is done, as a bar and a number. The number is the
 * shared listing score, so it matches the Profile page's header; gold at every
 * value, like that header.
 *
 * Worth the space: seeing "50% complete" is what makes a half-finished profile
 * feel like an open loop rather than a chore, and it is the one part of the
 * wizard that also earns its place on the dashboard later.
 */
export default function CompletionMeter({ percent }: Props) {
  return (
    <Box sx={{ minWidth: { sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Listing completeness
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {percent}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color="secondary"
        aria-label="Listing completeness"
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Box>
  );
}

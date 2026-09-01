import { Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import { promotionCountdown, promotionProgress, type PromotionRow } from '../../schema';

/**
 * When a campaign runs, and how far through it is.
 *
 * The dates answer "what did I set", the countdown answers "what do I have
 * left" — different questions, and a vendor deciding whether to extend a
 * campaign is asking the second one. The bar draws only while a campaign is
 * live: a full bar on an ended campaign and an empty one on a scheduled
 * campaign both say "0 of this is happening", which is exactly the confusion
 * the status chip already resolves.
 */
export default function PromotionWindow({
  promotion,
  now,
}: {
  promotion: PromotionRow;
  now: number;
}) {
  const progress = promotionProgress(promotion, now);
  const countdown = promotionCountdown(promotion, now);

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        spacing={1}
        sx={{ mb: progress ? 0.75 : 0 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
          {formatDate(promotion.starts_at)} – {formatDate(promotion.ends_at)}
        </Typography>
        {countdown && (
          <Typography
            variant="caption"
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              color: promotion.status === 'live' ? 'success.main' : 'text.secondary',
            }}
          >
            {countdown}
          </Typography>
        )}
      </Stack>

      {progress && (
        <>
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            color="success"
            aria-label={`Day ${progress.day} of ${progress.totalDays}`}
            sx={{
              height: 6,
              borderRadius: 3,
              // Tinted from the foreground rather than a fixed grey, so the
              // unfilled half stays visible on the warm dark canvas.
              bgcolor: 'action.hover',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Day {progress.day} of {progress.totalDays}
          </Typography>
        </>
      )}
    </Box>
  );
}

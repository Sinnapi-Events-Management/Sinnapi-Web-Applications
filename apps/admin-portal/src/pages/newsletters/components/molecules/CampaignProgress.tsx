import { Box, Typography, LinearProgress } from '@sinnapi/ui';
import type { NewsletterCampaignModel } from '@/lib/types';

type Props = { campaign: NewsletterCampaignModel };

/**
 * Delivery progress for one campaign row.
 *
 * Shows a bar only while a send is actually moving. A finished campaign gets a
 * plain count instead: a 100%-full progress bar on every historical row is
 * noise that makes the one campaign genuinely in flight harder to spot, which
 * is the only thing this column exists to surface.
 */
export default function CampaignProgress({ campaign }: Props) {
  const { recipient_count: total, sent_count: sent, failed_count: failed, status } = campaign;

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recipients
      </Typography>
    );
  }

  if (status !== 'sending') {
    return (
      <Typography variant="body2">
        {sent.toLocaleString()} / {total.toLocaleString()}
        {failed > 0 && (
          <Typography component="span" variant="body2" color="error.main">
            {' '}
            · {failed} failed
          </Typography>
        )}
      </Typography>
    );
  }

  const pct = Math.min(Math.round((sent / total) * 100), 100);
  return (
    <Box sx={{ minWidth: 140 }}>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
      <Typography variant="caption" color="text.secondary">
        {sent.toLocaleString()} of {total.toLocaleString()} sent
      </Typography>
    </Box>
  );
}

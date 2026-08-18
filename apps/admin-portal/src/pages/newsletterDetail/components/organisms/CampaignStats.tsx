import { Grid, SectionCard, Stack, Typography, LinearProgress, Box } from '@sinnapi/ui';
import type { NewsletterStats } from '@/lib/types';

type Props = { stats?: NewsletterStats };

/** One metric, its count, and its share of delivered. */
function Metric({
  label,
  value,
  denominator,
  tone,
}: {
  label: string;
  value: number;
  denominator?: number;
  tone?: 'success' | 'error' | 'warning';
}) {
  const pct = denominator && denominator > 0 ? Math.round((value / denominator) * 100) : null;
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }} color={tone ? `${tone}.main` : undefined}>
        {value.toLocaleString()}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
        {pct !== null && ` · ${pct}%`}
      </Typography>
    </Box>
  );
}

/**
 * Delivery and engagement for a sent campaign.
 *
 * Rates are against DELIVERED, not sent. Dividing by messages that bounced
 * flatters every number on the screen, and these are numbers meant to inform
 * whether the next campaign is worth writing.
 *
 * Bounces, complaints and unsubscribes sit on the same row as opens and clicks
 * rather than tucked away. They are the metrics that decide whether the sending
 * domain survives the next campaign, which makes them the most consequential
 * things here even though they are the least flattering.
 *
 * ── When there are no delivery receipts ─────────────────────────────────────
 * Delivered / opened / clicked are populated by provider webhooks, which only
 * the Resend transport emits. A campaign sent over the SMTP fallback has none
 * of them, forever — and "Delivered 0 · 0%" against a few thousand sent reads
 * as a total delivery failure rather than as an absent receipt. So a campaign
 * that was accepted but never reported on drops the percentages and says why,
 * which is the difference between a panel that is quiet and one that lies.
 */
export default function CampaignStats({ stats }: Props) {
  if (!stats) return null;

  const progress =
    stats.total > 0 ? Math.round(((stats.total - stats.queued) / stats.total) * 100) : 0;

  // Messages went out and not one receipt came back: the transport that carried
  // this campaign does not report delivery. Distinct from a campaign that has
  // genuinely delivered nothing, which would show bounces or failures instead.
  const noReceipts =
    stats.sent > 0 && stats.delivered === 0 && stats.bounced === 0 && stats.complained === 0;

  return (
    <SectionCard title="Delivery">
      <Stack spacing={2.5}>
        {stats.queued > 0 && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary">
              {stats.queued.toLocaleString()} still queued
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Metric label="Sent" value={stats.sent} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Metric
              label="Delivered"
              value={stats.delivered}
              denominator={noReceipts ? undefined : stats.sent}
              tone={noReceipts ? undefined : 'success'}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Metric label="Opened" value={stats.opened} denominator={stats.delivered} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Metric label="Clicked" value={stats.clicked} denominator={stats.delivered} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Metric label="Bounced" value={stats.bounced} denominator={stats.sent} tone="error" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Metric
              label="Complaints"
              value={stats.complained}
              denominator={stats.delivered}
              tone="error"
            />
          </Grid>
        </Grid>

        {noReceipts && (
          <Typography variant="body2" color="text.secondary">
            No delivery receipts were reported for this campaign, so opens and clicks cannot be
            measured. This is expected when a campaign is sent over the SMTP transport, which
            confirms only that each message was accepted for delivery.
          </Typography>
        )}

        {stats.skipped > 0 && (
          <Typography variant="body2" color="text.secondary">
            {stats.skipped.toLocaleString()} were deliberately not mailed — the address had
            unsubscribed, bounced or been reported before their turn came round, or had no
            unsubscribe token to send with.
          </Typography>
        )}

        {stats.failed > 0 && (
          <Typography variant="body2" color="error.main">
            {stats.failed.toLocaleString()} could not be handed to the mail provider at all after
            repeated attempts.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}

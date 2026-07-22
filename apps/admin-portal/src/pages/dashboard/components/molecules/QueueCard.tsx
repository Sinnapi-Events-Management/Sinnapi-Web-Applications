import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@sinnapi/ui';
import IconBadge from '@/components/ui/IconBadge';
import { QUEUE_ICONS, type QueueCardModel } from '../../schema';

type Props = { queue: QueueCardModel };

/**
 * One actionable queue: how many are waiting, how long the oldest has waited,
 * and where to go to clear it. The whole card is the link — a queue tile exists
 * to be acted on, so the entire surface is the target.
 *
 * Deliberately down to four elements (badge, label, count, one status line).
 * An earlier version also carried a description, a sparkline and a volume
 * footer; at six cards that put ~40 competing elements in the band an admin is
 * meant to *scan*. The trend still exists in the payload and is read on the
 * analytics tabs, where a chart is the point.
 */
export default function QueueCard({ queue }: Props) {
  const Icon = QUEUE_ICONS[queue.key];
  const clear = queue.count === 0;

  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardActionArea
        component={RouterLink}
        to={queue.to}
        sx={{ height: '100%', p: 2, display: 'block' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <IconBadge accent={queue.accent} size={34} iconSize={18}>
            <Icon />
          </IconBadge>
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
            {queue.label}
          </Typography>
        </Stack>

        <Typography variant="h3" sx={{ fontSize: '2rem', lineHeight: 1.1, mt: 1.5 }}>
          {queue.count.toLocaleString()}
        </Typography>

        <Box sx={{ mt: 1, minHeight: 24 }}>
          {/* One status line only, in severity order — an SLA breach outranks
              the backlog age, which outranks the all-clear. */}
          {queue.overdue > 0 ? (
            <Chip
              size="small"
              color="error"
              label={`${queue.overdue} overdue`}
              sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
            />
          ) : clear ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label="All clear"
              sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
            />
          ) : queue.waiting ? (
            <Typography variant="caption" color="text.secondary">
              Oldest waiting {queue.waiting}
            </Typography>
          ) : null}
        </Box>
      </CardActionArea>
    </Card>
  );
}

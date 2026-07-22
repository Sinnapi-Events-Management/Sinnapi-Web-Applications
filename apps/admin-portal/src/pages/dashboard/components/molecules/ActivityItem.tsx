import { Box, Stack, Typography } from '@sinnapi/ui';
import IconBadge from '@/components/ui/IconBadge';
import type { ActivityModel } from '../../schema';

type Props = { entry: ActivityModel };

/**
 * One line of the audit stream: what happened, to which record, by whom, when.
 * The subject line is only rendered when the audited snapshot carried something
 * human-readable — a raw UUID would be noise in a glanceable feed.
 */
export default function ActivityItem({ entry }: Props) {
  const { Icon } = entry;

  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.25 }}>
      <IconBadge accent={entry.accent} size={32} iconSize={17}>
        <Icon />
      </IconBadge>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {entry.label}
        </Typography>
        {entry.subject && (
          <Typography variant="body2" color="text.secondary" noWrap title={entry.subject}>
            {entry.subject}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {entry.actor} · {entry.occurredAt}
        </Typography>
      </Box>
    </Stack>
  );
}

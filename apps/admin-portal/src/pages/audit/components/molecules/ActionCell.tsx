import { Stack, Typography } from '@sinnapi/ui';
import IconBadge from '@/components/ui/IconBadge';
import type { AuditLogModel } from '@/lib/types';
import { describeAction } from '../../schema/presenter';

/**
 * Plain-language action: a colour-coded operation icon (green created, amber
 * updated, red deleted) beside a full sentence a non-technical admin can read.
 */
export default function ActionCell({ log }: { log: AuditLogModel }) {
  const { label, accent, Icon } = describeAction(log);
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <IconBadge accent={accent} size={32} circular>
        <Icon />
      </IconBadge>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
  );
}

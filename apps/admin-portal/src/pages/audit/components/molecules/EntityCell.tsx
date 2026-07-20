import { Box, Typography } from '@sinnapi/ui';
import type { AuditLogModel } from '@/lib/types';
import { entityLabel, entitySummary, shortId } from '../../schema/presenter';

/**
 * The affected record in human terms: a friendly type label with the record's
 * own name/title (from the stored snapshot) beneath it, falling back to a short
 * reference id when no readable label exists.
 */
export default function EntityCell({ log }: { log: AuditLogModel }) {
  const summary = entitySummary(log);
  const ref = shortId(log.entity_id);
  const secondary = summary ?? (ref ? `Ref ${ref}` : '—');

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" fontWeight={600} noWrap>
        {entityLabel(log.entity_type)}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {secondary}
      </Typography>
    </Box>
  );
}

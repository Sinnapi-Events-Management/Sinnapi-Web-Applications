import { useRef } from 'react';
import { Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import IconBadge from '@/components/ui/IconBadge';
import InfoRow from '@/components/ui/InfoRow';
import { formatDateTime } from '@/lib/config';
import type { AuditLogModel } from '@/lib/types';
import { changedFields, describeAction, entityLabel, entitySummary } from '../../schema/presenter';
import ActorCell from '../molecules/ActorCell';
import ChangeDiffList from '../molecules/ChangeDiffList';

type Props = {
  log: AuditLogModel | null;
  open: boolean;
  onClose: () => void;
};

/**
 * Right-hand drawer expanding a single audit entry: who did what to which
 * record, when, and the exact before → after field changes. Never loses the
 * table's scroll position (search-result guidance for audit UIs).
 *
 * The last opened entry is retained through the slide-out so content doesn't
 * blank while the page clears the selection.
 */
export default function AuditDetailDrawer({ log, open, onClose }: Props) {
  const lastLog = useRef<AuditLogModel | null>(log);
  if (open && log) lastLog.current = log;
  const shown = open ? log : lastLog.current;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 460 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      {shown && <DrawerBody log={shown} onClose={onClose} />}
    </Drawer>
  );
}

function DrawerBody({ log, onClose }: { log: AuditLogModel; onClose: () => void }) {
  const action = describeAction(log);
  const changes = changedFields(log);

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 3, py: 2 }}>
        <IconBadge accent={action.accent} size={40} circular>
          <action.Icon />
        </IconBadge>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {action.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {formatDateTime(log.occurred_at)}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close details" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ p: 3, overflowY: 'auto' }}>
        <Typography variant="overline" color="text.secondary">
          Performed by
        </Typography>
        <Box sx={{ mt: 1, mb: 2 }}>
          <ActorCell log={log} />
        </Box>

        <InfoRow label="Record type" value={entityLabel(log.entity_type)} />
        <InfoRow label="Record" value={entitySummary(log) ?? undefined} />
        <InfoRow
          label="Reference id"
          value={log.entity_id ?? undefined}
          copyValue={log.entity_id ?? undefined}
          mono
        />

        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', mt: 3, mb: 1 }}
        >
          What changed
        </Typography>
        <ChangeDiffList changes={changes} />
      </Box>
    </>
  );
}

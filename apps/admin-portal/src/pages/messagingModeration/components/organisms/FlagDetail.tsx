import { Stack, Box, Typography, Button, IconButton } from '@sinnapi/ui';
import BlockIcon from '@mui/icons-material/Block';
import CloseIcon from '@mui/icons-material/Close';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import StatusChip from '@/components/ui/StatusChip';
import InfoRow from '@/components/ui/InfoRow';
import { formatDateTime, titleize } from '@/lib/config';
import { reasonMeta } from '../../schema';
import type { FlagView } from '../../hooks/useMessagingModeration';

type Props = {
  flag: FlagView | null;
  busy: boolean;
  onBlock: (messageId: string | undefined, flagId: string) => void;
  onDismiss: (flagId: string) => void;
  onClose: () => void;
};

/**
 * The detail column of the workspace: the full review surface for a single flag
 * — message content, metadata and the block/dismiss actions. Renders a guiding
 * placeholder when nothing is selected. Presentational: mutations come from the
 * page's hook.
 */
export default function FlagDetail({ flag, busy, onBlock, onDismiss, onClose }: Props) {
  if (!flag) return <FlagDetailPlaceholder />;

  const { label, color, Icon } = reasonMeta(flag.reason);

  return (
    <Stack spacing={2.5} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            flexShrink: 0,
            color: `${color}.main`,
            bgcolor: `${color}.light`,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }} noWrap>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Flagged message review
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close review">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'action.hover',
          borderLeft: 3,
          borderLeftColor: `${color}.main`,
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Message content
        </Typography>
        <Typography
          variant="body1"
          color={flag.body ? 'text.primary' : 'text.disabled'}
          sx={{ fontStyle: flag.body ? 'italic' : 'normal', wordBreak: 'break-word' }}
        >
          {flag.body ? `“${flag.body}”` : 'Message content unavailable'}
        </Typography>
      </Box>

      <Box>
        <InfoRow label="Status" value={<StatusChip status={flag.status} />} />
        <InfoRow label="Reason" value={label} />
        <InfoRow label="Flagged" value={formatDateTime(flag.createdAt)} />
        <InfoRow
          label="Message ID"
          value={flag.messageId}
          mono
          copyValue={flag.messageId ?? undefined}
        />
      </Box>

      <Box sx={{ flex: 1 }} />

      {flag.actionable ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            fullWidth
            color="error"
            variant="contained"
            startIcon={<BlockIcon />}
            disabled={busy}
            onClick={() => onBlock(flag.messageId, flag.id)}
          >
            Block message
          </Button>
          <Button
            fullWidth
            color="inherit"
            variant="outlined"
            disabled={busy}
            onClick={() => onDismiss(flag.id)}
          >
            Dismiss flag
          </Button>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          This flag has already been {titleize(flag.status).toLowerCase()}. No further action is
          required.
        </Typography>
      )}
    </Stack>
  );
}

/** Guiding empty state shown in the detail pane before a flag is picked. */
function FlagDetailPlaceholder() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ height: '100%', minHeight: 360, textAlign: 'center', color: 'text.secondary', px: 3 }}
    >
      <ForumOutlinedIcon sx={{ fontSize: 52, color: 'grey.400' }} />
      <Typography variant="subtitle1" color="text.primary">
        Select a flag to review
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 300 }}>
        Choose a flagged message from the queue to see its full content and take moderation action.
      </Typography>
    </Stack>
  );
}

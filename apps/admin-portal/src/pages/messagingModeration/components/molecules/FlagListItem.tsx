import { Box, Stack, Typography, Checkbox, CardActionArea } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDateTime } from '@/lib/config';
import { reasonMeta } from '../../schema';
import type { FlagView } from '../../hooks/useMessagingModeration';

type Props = {
  flag: FlagView;
  active: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
};

/**
 * Compact queue row for the master list. Clicking the body opens the flag in the
 * detail pane; the checkbox (open flags only) drives bulk selection independently.
 * Severity tints the left accent, the active flag reads as selected. Purely
 * presentational — all state comes from the page's hooks.
 */
export default function FlagListItem({ flag, active, selected, onOpen, onToggleSelect }: Props) {
  const { label, color, Icon } = reasonMeta(flag.reason);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 2,
        border: 1,
        borderColor: active ? 'primary.main' : 'divider',
        borderLeftWidth: 3,
        borderLeftColor: `${color}.main`,
        bgcolor: active ? 'action.selected' : 'background.paper',
        boxShadow: active ? 2 : 0,
        overflow: 'hidden',
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease',
      }}
    >
      {flag.actionable && (
        <Box sx={{ pl: 0.5, pt: 1, alignSelf: 'flex-start' }}>
          <Checkbox
            size="small"
            checked={selected}
            onChange={() => onToggleSelect(flag.id)}
            onClick={(e) => e.stopPropagation()}
            inputProps={{ 'aria-label': `Select ${label} flag` }}
          />
        </Box>
      )}

      <CardActionArea
        onClick={() => onOpen(flag.id)}
        aria-label={`Review ${label} flag`}
        sx={{ flex: 1, minWidth: 0, p: 1.5, pl: flag.actionable ? 1 : 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <Icon fontSize="small" color={color} />
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {label}
          </Typography>
          <StatusChip status={flag.status} />
        </Stack>

        <Typography
          variant="body2"
          color={flag.body ? 'text.secondary' : 'text.disabled'}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontStyle: flag.body ? 'normal' : 'italic',
            wordBreak: 'break-word',
          }}
        >
          {flag.body ?? 'Message content unavailable'}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Flagged {formatDateTime(flag.createdAt)}
        </Typography>
      </CardActionArea>
    </Box>
  );
}

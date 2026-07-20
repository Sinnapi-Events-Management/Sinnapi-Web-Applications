import { Paper, Stack, Box, Typography, Button, Checkbox } from '@sinnapi/ui';
import BlockIcon from '@mui/icons-material/Block';
import type { Selection } from '../../hooks/useMessagingModeration';

type Props = {
  selection: Selection;
  busy: boolean;
  onBlock: () => void;
  onDismiss: () => void;
};

/**
 * Select-all + bulk actions header for the queue. Renders only when there are
 * actionable flags on screen; the action buttons stay disabled until at least
 * one flag is selected. Highlights itself once a selection is active.
 */
export default function BulkActionBar({ selection, busy, onBlock, onDismiss }: Props) {
  if (selection.selectableCount === 0) return null;

  const active = selection.someSelected;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1,
        mb: 2,
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: active ? 'action.selected' : 'transparent',
        transition: 'background-color 120ms ease, border-color 120ms ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Checkbox
          size="small"
          checked={selection.allSelected}
          indeterminate={active && !selection.allSelected}
          onChange={selection.toggleAll}
          inputProps={{ 'aria-label': 'Select all open flags' }}
        />
        <Typography variant="body2" color="text.secondary">
          {active
            ? `${selection.count} selected`
            : `Select all (${selection.selectableCount} open)`}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {active && (
          <Stack direction="row" spacing={1}>
            <Button size="small" color="inherit" disabled={busy} onClick={selection.clear}>
              Clear
            </Button>
            <Button size="small" disabled={busy} onClick={onDismiss}>
              Dismiss selected
            </Button>
            <Button
              size="small"
              color="error"
              variant="contained"
              startIcon={<BlockIcon />}
              disabled={busy}
              onClick={onBlock}
            >
              Block selected
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

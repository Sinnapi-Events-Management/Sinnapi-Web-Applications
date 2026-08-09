'use client';
/**
 * The strip under a calendar: what is currently chosen, and the two escapes
 * from it. Shared by the single and range pickers so both read the same way.
 */
import { Box, Button, Divider, Stack, Typography } from '@mui/material';

export type PickerFooterProps = {
  /** Echo of the current (possibly half-picked) selection. */
  summary?: string;
  /** Placeholder shown when nothing is selected yet. */
  emptyHint: string;
  onClear: () => void;
  clearDisabled?: boolean;
  /** Optional right-hand action — "Today" for a single date, "Done" for a range. */
  action?: { label: string; onClick: () => void };
};

export function PickerFooter({
  summary,
  emptyHint,
  onClear,
  clearDisabled,
  action,
}: PickerFooterProps) {
  return (
    <Box>
      <Divider />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: 1.5, py: 1 }}
      >
        <Typography
          variant="body2"
          color={summary ? 'text.primary' : 'text.secondary'}
          sx={{ fontWeight: summary ? 600 : 400, minWidth: 0, overflow: 'hidden' }}
          noWrap
        >
          {summary || emptyHint}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Button size="small" color="inherit" onClick={onClear} disabled={clearDisabled}>
            Clear
          </Button>
          {action && (
            <Button size="small" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

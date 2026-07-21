import { Box, Stack, Typography, Switch, CircularProgress } from '@sinnapi/ui';
import type { PermissionModel } from '@/lib/types';

type Props = {
  permission: PermissionModel;
  granted: boolean;
  /** Read-only role — the switch shows state but refuses input. */
  locked: boolean;
  /** This row's own write is in flight. */
  pending: boolean;
  /** A category or copy write is in flight; every row waits it out. */
  busy: boolean;
  onToggle: (permissionId: string, on: boolean) => void;
};

/**
 * One permission: its key, what it allows, and the switch that grants it.
 *
 * The label is a `<label>` wrapping the text so the whole row is clickable, and
 * the switch carries the permission key as its accessible name — a screen reader
 * reaching the control announces `escrow.release`, not "switch".
 */
export default function PermissionRow({
  permission,
  granted,
  locked,
  pending,
  busy,
  onToggle,
}: Props) {
  const disabled = locked || pending || busy;
  const id = `perm-${permission.id}`;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 1,
        px: 0.5,
        borderRadius: 1.5,
        transition: 'background-color 120ms',
        '&:hover': { bgcolor: locked ? 'transparent' : 'action.hover' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="label"
          htmlFor={id}
          variant="body2"
          sx={{
            display: 'block',
            fontWeight: 600,
            fontFamily: 'monospace',
            cursor: locked ? 'default' : 'pointer',
            // Permission keys are dotted and unbreakable at narrow widths; let
            // them wrap anywhere rather than widen the pane.
            overflowWrap: 'anywhere',
          }}
        >
          {permission.key}
        </Typography>
        {permission.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {permission.description}
          </Typography>
        )}
      </Box>

      {/* Reserves the switch's width while a write is in flight, so the rows
          around it don't shift as the spinner swaps in. */}
      <Box sx={{ width: 58, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {pending ? (
          <CircularProgress size={18} />
        ) : (
          <Switch
            id={id}
            checked={granted}
            disabled={disabled}
            onChange={(_, on) => onToggle(permission.id, on)}
            inputProps={{ 'aria-label': permission.key }}
          />
        )}
      </Box>
    </Stack>
  );
}

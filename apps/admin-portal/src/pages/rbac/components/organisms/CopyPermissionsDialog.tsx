import {
  Box,
  Stack,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@sinnapi/ui';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import IconBadge from '@/components/ui/IconBadge';
import type { RoleModel } from '@/lib/types';
import type { CopyPermissionsState } from '../../hooks/useCopyPermissions';

type Props = {
  copy: CopyPermissionsState;
  /** The role being written to — named in the confirmation copy. */
  target: RoleModel | undefined;
};

/** One side of the diff: how many permissions the copy would add or remove. */
function DiffChip({
  count,
  label,
  icon,
  color,
}: {
  count: number;
  label: string;
  /** An element, not a node — MUI clones it to attach its own class. */
  icon: React.ReactElement;
  color: 'success' | 'error';
}) {
  return (
    <Chip
      size="small"
      icon={count > 0 ? icon : undefined}
      label={`${count} ${label}`}
      color={count > 0 ? color : 'default'}
      variant={count > 0 ? 'filled' : 'outlined'}
    />
  );
}

/**
 * Mirror another role's permission set onto the open role.
 *
 * This replaces rather than merges, so the diff is shown before the button is
 * pressed: copying a narrow role onto a broad one revokes, and the revoke count
 * is exactly the number an admin needs to see first. The action stays disabled
 * until a source is chosen and the two sets actually differ.
 */
export default function CopyPermissionsDialog({ copy, target }: Props) {
  const { source, diff, busy } = copy;

  return (
    <Dialog
      open={copy.open}
      onClose={copy.close}
      fullWidth
      maxWidth="xs"
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)' } } }}
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconBadge accent="secondary" size={40} iconSize={20}>
            <ContentCopyIcon />
          </IconBadge>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Copy permissions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              onto {target?.name ?? 'the selected role'}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <TextField
          select
          fullWidth
          label="Copy from"
          value={copy.sourceId ?? ''}
          onChange={(e) => copy.setSourceId(e.target.value || null)}
          disabled={busy}
          sx={{ mt: 1 }}
        >
          {copy.options.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {role.name} · {(role.role_permissions ?? []).length} granted
            </MenuItem>
          ))}
        </TextField>

        {source && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="overline" color="text.secondary">
              This will
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.75 }}>
              <DiffChip
                count={diff.grant.length}
                label="to grant"
                icon={<AddIcon />}
                color="success"
              />
              <DiffChip
                count={diff.revoke.length}
                label="to revoke"
                icon={<RemoveIcon />}
                color="error"
              />
              <Chip size="small" variant="outlined" label={`${diff.unchanged} unchanged`} />
            </Stack>

            {diff.revoke.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This replaces the role's permissions — {diff.revoke.length} currently granted{' '}
                {diff.revoke.length === 1 ? 'permission' : 'permissions'} will be revoked.
              </Alert>
            )}
            {copy.isNoop && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {target?.name ?? 'This role'} already holds exactly these permissions.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
        <Button fullWidth variant="outlined" color="inherit" onClick={copy.close} disabled={busy}>
          Cancel
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          disableElevation
          onClick={() => void copy.confirm()}
          disabled={!copy.canConfirm || busy}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {busy ? 'Copying…' : 'Copy permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

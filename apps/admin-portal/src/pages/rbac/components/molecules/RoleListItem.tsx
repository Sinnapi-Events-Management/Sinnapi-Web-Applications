import { Box, Stack, Typography, Chip, Tooltip } from '@sinnapi/ui';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { RoleModel } from '@/lib/types';
import GrantMeter from './GrantMeter';

type Props = {
  role: RoleModel;
  /** Size of the permission catalog — the denominator of the meter. */
  totalPermissions: number;
  selected: boolean;
  onSelect: (role: RoleModel) => void;
};

/**
 * One role in the master column: name, key, its admin/locked badges and how much
 * of the catalog it holds.
 *
 * A button rather than a ListItemButton so the whole card is the hit target and
 * the selected state can be carried by the border — at this density a filled
 * selection row fights with the meter inside it.
 */
export default function RoleListItem({ role, totalPermissions, selected, onSelect }: Props) {
  const granted = (role.role_permissions ?? []).length;
  const locked = !!role.is_admin;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(role)}
      aria-pressed={selected}
      sx={{
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: selected ? 'secondary.main' : 'divider',
        // The selected card is carried by a thicker leading edge as well as the
        // tint, so the state survives for anyone who can't separate the hues.
        borderLeftWidth: 3,
        borderLeftColor: selected ? 'secondary.main' : 'transparent',
        bgcolor: selected ? 'action.selected' : 'background.paper',
        transition: 'border-color 120ms, background-color 120ms',
        '&:hover': { borderColor: selected ? 'secondary.main' : 'text.disabled' },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {role.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {role.key}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {locked && (
            <Tooltip title="Admin role — permissions are read-only">
              <Chip
                size="small"
                icon={<LockOutlinedIcon />}
                label="admin"
                color="secondary"
                variant={selected ? 'filled' : 'outlined'}
              />
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Box sx={{ mt: 1.25 }}>
        <GrantMeter
          granted={granted}
          total={totalPermissions}
          accent={locked ? 'secondary' : 'primary'}
        />
      </Box>
    </Box>
  );
}

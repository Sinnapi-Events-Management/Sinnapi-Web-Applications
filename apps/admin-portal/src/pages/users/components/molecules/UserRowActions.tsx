import { useState } from 'react';
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { UserModel } from '@/lib/types';

type Props = {
  user: UserModel;
  onEdit: (user: UserModel) => void;
  onResetPassword: (user: UserModel) => void;
  /** Cells only signal intent — the page owns confirmation and the write. */
  onRequestStatusChange: (user: UserModel, status: 'active' | 'suspended') => void;
  onRequestDelete: (user: UserModel) => void;
};

/**
 * Row action menu for a staff user. Four actions behind one trigger keeps the
 * column narrow and the table scannable.
 *
 * Active users can be blocked; suspended or pending users can be activated.
 * Every click stops propagation so it never reaches a row-level handler.
 */
export default function UserRowActions({
  user,
  onEdit,
  onResetPassword,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const name = user.full_name ?? user.email ?? 'user';
  const active = user.status === 'active';

  function openMenu(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  /** Closes the menu, then runs the action. */
  function select(action: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setAnchorEl(null);
      action();
    };
  }

  return (
    <>
      <Tooltip title="User actions">
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label={`Actions for ${name}`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2 } } }}
      >
        <MenuItem onClick={select(() => onEdit(user))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit user</ListItemText>
        </MenuItem>

        <MenuItem onClick={select(() => onResetPassword(user))}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reset password</ListItemText>
        </MenuItem>

        {active ? (
          <MenuItem onClick={select(() => onRequestStatusChange(user, 'suspended'))}>
            <ListItemIcon>
              <BlockIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Block user</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={select(() => onRequestStatusChange(user, 'active'))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate user</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={select(() => onRequestDelete(user))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove user</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

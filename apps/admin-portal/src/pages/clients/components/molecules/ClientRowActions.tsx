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
import VisibilityIcon from '@mui/icons-material/Visibility';
import LockResetIcon from '@mui/icons-material/LockReset';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { UserModel } from '@/lib/types';

type Props = {
  client: UserModel;
  onView: (client: UserModel) => void;
  onResetPassword: (client: UserModel) => void;
  onResendConfirmation: (client: UserModel) => void;
  onRequestStatusChange: (client: UserModel, status: 'active' | 'suspended') => void;
  onRequestDelete: (client: UserModel) => void;
};

/**
 * Row action menu for a client. The row itself navigates to the detail page, so
 * every click here stops propagation to avoid double-triggering that.
 */
export default function ClientRowActions({
  client,
  onView,
  onResetPassword,
  onResendConfirmation,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const name = client.full_name ?? client.email ?? 'client';
  const active = client.status === 'active';
  // `pending` means the account was self-registered and the email was never
  // confirmed, which is the only state a new link can help with.
  const pendingConfirmation = client.status === 'pending';

  function openMenu(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  function select(action: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setAnchorEl(null);
      action();
    };
  }

  return (
    <>
      <Tooltip title="Client actions">
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
        <MenuItem onClick={select(() => onView(client))}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View client</ListItemText>
        </MenuItem>

        <MenuItem onClick={select(() => onResetPassword(client))}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Trigger password reset</ListItemText>
        </MenuItem>

        {/* Offered only while the account is pending: the confirmation link
            expires after 24 hours, so a client who opened the mail late is
            stuck until support re-issues it. Hidden rather than disabled for a
            confirmed account — there is nothing left to confirm. */}
        {pendingConfirmation && (
          <MenuItem onClick={select(() => onResendConfirmation(client))}>
            <ListItemIcon>
              <ForwardToInboxIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resend confirmation email</ListItemText>
          </MenuItem>
        )}

        {active ? (
          <MenuItem onClick={select(() => onRequestStatusChange(client, 'suspended'))}>
            <ListItemIcon>
              <BlockIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Block client</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={select(() => onRequestStatusChange(client, 'active'))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate client</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={select(() => onRequestDelete(client))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove client</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

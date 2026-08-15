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
import StorefrontIcon from '@mui/icons-material/Storefront';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import LockResetIcon from '@mui/icons-material/LockReset';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { VendorAccountModel } from '@/lib/types';
import { availableActions, canResendCredentials, type LifecycleAction } from '../../schema/actions';

type Props = {
  row: VendorAccountModel;
  onViewListing: (row: VendorAccountModel) => void;
  onResendCredentials: (row: VendorAccountModel) => void;
  onResetPassword: (row: VendorAccountModel) => void;
  onLifecycleAction: (row: VendorAccountModel, action: LifecycleAction) => void;
};

/**
 * Glyphs for the lifecycle actions. Kept here rather than in the spec so
 * `schema/actions.ts` stays pure data with no React import — it is also read by
 * the dialog, which needs the rules and not the icons.
 */
const ACTION_ICONS: Record<LifecycleAction, React.ReactNode> = {
  suspend: <PauseCircleOutlineIcon fontSize="small" color="warning" />,
  deactivate: <PowerSettingsNewIcon fontSize="small" />,
  block: <BlockIcon fontSize="small" color="error" />,
  activate: <CheckCircleOutlineIcon fontSize="small" color="success" />,
};

/**
 * Row action menu for a vendor account. Which lifecycle transitions appear is
 * decided by `availableActions` from the row's own status, so an account can
 * never be offered a move it is not in a state to make.
 *
 * Every handler stops propagation: the row itself is clickable.
 */
export default function VendorAccountRowActions({
  row,
  onViewListing,
  onResendCredentials,
  onResetPassword,
  onLifecycleAction,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const name = row.full_name ?? row.business_name ?? row.email ?? 'vendor';
  const lifecycle = availableActions(row.account_status);

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
      <Tooltip title="Vendor account actions">
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
        slotProps={{ paper: { sx: { minWidth: 240, borderRadius: 2 } } }}
      >
        {row.vendor_id && (
          <MenuItem onClick={select(() => onViewListing(row))}>
            <ListItemIcon>
              <StorefrontIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View vendor listing</ListItemText>
          </MenuItem>
        )}

        {/* Hidden rather than disabled once the vendor has signed in: at that
            point they own a password of their own, and replacing it silently
            from here would be a lockout, not support. The reset link below is
            the right instrument for them. */}
        {canResendCredentials(row) && (
          <MenuItem onClick={select(() => onResendCredentials(row))}>
            <ListItemIcon>
              <ForwardToInboxIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resend sign-in credentials</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={select(() => onResetPassword(row))}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send password reset link</ListItemText>
        </MenuItem>

        {lifecycle.length > 0 && <Divider />}

        {lifecycle.map((spec) => (
          <MenuItem
            key={spec.action}
            onClick={select(() => onLifecycleAction(row, spec.action))}
            sx={spec.tone === 'error' ? { color: 'error.main' } : undefined}
          >
            <ListItemIcon>{ACTION_ICONS[spec.action]}</ListItemIcon>
            <ListItemText>{spec.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

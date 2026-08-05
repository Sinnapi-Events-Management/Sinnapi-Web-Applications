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
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockResetIcon from '@mui/icons-material/LockReset';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import { capabilities } from '../../schema/presenter';
import type { BlockedActionKind } from '../../hooks/useBlockedActions';
import type { BlockedAccountModel } from '@/lib/types';

type Props = {
  row: BlockedAccountModel;
  onAction: (row: BlockedAccountModel, kind: BlockedActionKind) => void;
};

/**
 * Row action menu. Which entries appear is decided by `capabilities`, not here —
 * the rules are domain facts (a suspension cannot be "unlocked"; an address with
 * no account cannot be emailed) and belong beside the other row logic.
 *
 * Unavailable actions are omitted rather than disabled: a greyed-out "Send reset
 * link" on an address that has no account invites a click and explains nothing.
 */
export default function BlockedRowActions({ row, onAction }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const caps = capabilities(row);

  function select(kind: BlockedActionKind) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setAnchorEl(null);
      onAction(row, kind);
    };
  }

  // Nothing actionable — render nothing rather than an empty menu.
  if (!caps.canUnlock && !caps.canEmail) return null;

  return (
    <>
      <Tooltip title="Account actions">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
          aria-label={`Actions for ${row.email}`}
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
        {caps.canUnlock && (
          <MenuItem onClick={select('unlock')}>
            <ListItemIcon>
              <LockOpenIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Clear lockout"
              secondary="Lets them try again immediately"
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}

        {caps.canUnlock && caps.canEmail && <Divider />}

        {caps.canEmail && (
          <MenuItem onClick={select('reset')}>
            <ListItemIcon>
              <LockResetIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send password reset</ListItemText>
          </MenuItem>
        )}

        {caps.canResendConfirmation && (
          <MenuItem onClick={select('confirmation')}>
            <ListItemIcon>
              <ForwardToInboxIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resend confirmation email</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

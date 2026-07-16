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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { VendorStatus } from '@/hooks/useVendorStatus';
import type { VendorAdminModel } from '@/lib/types';
import { canDeleteVendor, DELETE_BLOCKED_REASON } from '../../hooks/useVendorDelete';

type Props = {
  vendor: VendorAdminModel;
  onView: (vendor: VendorAdminModel) => void;
  onEdit: (vendor: VendorAdminModel) => void;
  /** Cells only signal intent — the page owns confirmation and the write. */
  onRequestStatusChange: (vendor: VendorAdminModel, status: VendorStatus) => void;
  onRequestDelete: (vendor: VendorAdminModel) => void;
};

/**
 * Row action menu. Four actions behind one trigger keeps the column narrow and
 * the table scannable.
 *
 * Every click is stopped from propagating: the row itself navigates on click,
 * and although the menu is portalled out of the row in the DOM, React still
 * bubbles synthetic events up the component tree to the row's handler.
 */
export default function VendorRowActions({
  vendor,
  onView,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const name = vendor.business_name ?? 'vendor';
  const active = vendor.status === 'active';
  const deletable = canDeleteVendor(vendor.status);

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

  const deleteItem = (
    <MenuItem
      disabled={!deletable}
      onClick={deletable ? select(() => onRequestDelete(vendor)) : undefined}
      sx={{ color: 'error.main', width: '100%' }}
    >
      <ListItemIcon>
        <DeleteOutlineIcon fontSize="small" color={deletable ? 'error' : 'disabled'} />
      </ListItemIcon>
      <ListItemText>Delete vendor</ListItemText>
    </MenuItem>
  );

  return (
    <>
      <Tooltip title="Vendor actions">
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
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 2 } } }}
      >
        <MenuItem onClick={select(() => onView(vendor))}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View vendor</ListItemText>
        </MenuItem>

        <MenuItem onClick={select(() => onEdit(vendor))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit vendor</ListItemText>
        </MenuItem>

        {active ? (
          <MenuItem onClick={select(() => onRequestStatusChange(vendor, 'suspended'))}>
            <ListItemIcon>
              <BlockIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Suspend vendor</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={select(() => onRequestStatusChange(vendor, 'active'))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate vendor</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {/* A disabled MenuItem emits no pointer events, so the tooltip explaining
            why needs a live wrapper to hang off. The wrapper is only added when
            disabled — MenuList tracks arrow-key focus through its direct
            children, and it already skips disabled items. */}
        {deletable ? (
          deleteItem
        ) : (
          <Tooltip title={DELETE_BLOCKED_REASON} placement="left">
            <span>{deleteItem}</span>
          </Tooltip>
        )}
      </Menu>
    </>
  );
}

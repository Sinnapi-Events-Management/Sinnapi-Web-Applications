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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ServiceRegionModel } from '@/lib/types';

type Props = {
  region: ServiceRegionModel;
  onEdit: (region: ServiceRegionModel) => void;
  onRequestDelete: (region: ServiceRegionModel) => void;
};

/**
 * Row action menu for a region. One trigger keeps the column narrow; every
 * click is stopped from propagating so it never triggers a row navigate handler.
 */
export default function RegionRowActions({ region, onEdit, onRequestDelete }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

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
      <Tooltip title="Region actions">
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label={`Actions for ${region.name}`}
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
        <MenuItem onClick={select(() => onEdit(region))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit region</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={select(() => onRequestDelete(region))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete region</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

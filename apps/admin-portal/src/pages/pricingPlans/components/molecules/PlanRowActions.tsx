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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PlanModel } from '@/lib/types';

type Props = {
  plan: PlanModel;
  onView: (plan: PlanModel) => void;
  onEdit: (plan: PlanModel) => void;
  onRequestDelete: (plan: PlanModel) => void;
};

/**
 * Row action menu for a plan. One trigger keeps the column narrow; every click
 * is stopped from propagating so it never triggers the row's navigate handler.
 */
export default function PlanRowActions({ plan, onView, onEdit, onRequestDelete }: Props) {
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
      <Tooltip title="Plan actions">
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label={`Actions for ${plan.name}`}
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
        <MenuItem onClick={select(() => onView(plan))}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View plan</ListItemText>
        </MenuItem>

        <MenuItem onClick={select(() => onEdit(plan))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit plan</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={select(() => onRequestDelete(plan))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete plan</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

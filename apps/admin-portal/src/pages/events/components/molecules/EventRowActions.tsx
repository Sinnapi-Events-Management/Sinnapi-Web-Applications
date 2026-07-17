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
import PublishIcon from '@mui/icons-material/Publish';
import DoDisturbOnOutlinedIcon from '@mui/icons-material/DoDisturbOnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { SvgIconComponent } from '@mui/icons-material';
import type { EventStatus } from '@/lib/status';
import type { EventModel } from '@/lib/types';
import { getStatusTransitions } from '../../schema';

type Props = {
  event: EventModel;
  /** Open the event detail page. */
  onView: (event: EventModel) => void;
  onEdit: (event: EventModel) => void;
  /** Cells only signal intent — the page owns confirmation and the write. */
  onRequestStatusChange: (event: EventModel, status: EventStatus) => void;
  onRequestDelete: (event: EventModel) => void;
};

/** Icon per target status, so each transition reads at a glance. */
const TRANSITION_ICON: Record<EventStatus, SvgIconComponent> = {
  published: PublishIcon,
  closed: DoDisturbOnOutlinedIcon,
  archived: Inventory2OutlinedIcon,
  draft: RestoreIcon,
};

const TONE_COLOR = {
  success: 'success',
  warning: 'warning',
  neutral: 'inherit',
} as const;

/**
 * Row action menu. Edit, the status moves valid from the event's current status
 * (see `getStatusTransitions`), then delete — all behind one trigger to keep the
 * column narrow and the table scannable.
 *
 * Every click is stopped from propagating: the row itself opens the edit drawer
 * on click, and although the menu is portalled out of the row in the DOM, React
 * still bubbles synthetic events up the component tree to the row's handler.
 */
export default function EventRowActions({
  event,
  onView,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const transitions = getStatusTransitions(event.status);

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
      <Tooltip title="Event actions">
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label={`Actions for ${event.title}`}
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
        <MenuItem onClick={select(() => onView(event))}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View event</ListItemText>
        </MenuItem>

        <MenuItem onClick={select(() => onEdit(event))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit event</ListItemText>
        </MenuItem>

        {transitions.map((t) => {
          const Icon = TRANSITION_ICON[t.to];
          const color = TONE_COLOR[t.tone];
          return (
            <MenuItem key={t.to} onClick={select(() => onRequestStatusChange(event, t.to))}>
              <ListItemIcon>
                <Icon fontSize="small" color={color === 'inherit' ? undefined : color} />
              </ListItemIcon>
              <ListItemText>{t.label}</ListItemText>
            </MenuItem>
          );
        })}

        <Divider />

        <MenuItem onClick={select(() => onRequestDelete(event))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete event</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

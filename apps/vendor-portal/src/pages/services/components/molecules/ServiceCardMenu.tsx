import { useState, type MouseEvent } from 'react';
import { IconButton, Menu, MenuItem } from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import type { ServiceState } from '../../schema';

type Props = {
  /** Names the button for screen readers — "Actions for Wedding photography". */
  title: string;
  state: ServiceState;
  disabled: boolean;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

/**
 * What a vendor can do to one service, behind one button.
 *
 * A menu rather than a row of icons. Three actions on a card that already
 * carries a title, a status, a set of chips and a derived price is four things
 * competing for the same corner, and on a phone it is four 40px targets inside
 * a 300px column. The menu also lets the archived state offer a different set
 * entirely instead of showing three disabled controls.
 *
 * AN ARCHIVED SERVICE OFFERS ONLY RESTORE
 * Not edit, not hide. Editing a service that is out of the catalogue is a
 * change with nowhere to land, and "hide" on something already invisible is a
 * control that does nothing. Restore first; then it is a service again and has
 * a service's actions.
 *
 * `disabled` is the card's own in-flight state, so the menu cannot be used to
 * queue a second write on a row that is still settling the first.
 */
export default function ServiceCardMenu({
  title,
  state,
  disabled,
  onEdit,
  onToggleVisibility,
  onArchive,
  onRestore,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const closeMenu = () => setAnchor(null);
  const pick = (action: () => void) => () => {
    closeMenu();
    action();
  };

  const isLive = state === 'live';

  return (
    <>
      <IconButton
        aria-label={`Actions for ${title}`}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        disabled={disabled}
        size="small"
      >
        <MoreVertIcon />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        {state === 'archived' ? (
          <MenuItem onClick={pick(onRestore)}>
            <UnarchiveOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
            Restore to catalogue
          </MenuItem>
        ) : (
          [
            <MenuItem key="edit" onClick={pick(onEdit)}>
              <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
              Edit
            </MenuItem>,
            <MenuItem key="visibility" onClick={pick(onToggleVisibility)}>
              {isLive ? (
                <VisibilityOffOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
              ) : (
                <VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
              )}
              {isLive ? 'Hide from clients' : 'Show to clients'}
            </MenuItem>,
            <MenuItem key="archive" onClick={pick(onArchive)} sx={{ color: 'error.main' }}>
              <ArchiveOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
              Archive
            </MenuItem>,
          ]
        )}
      </Menu>
    </>
  );
}

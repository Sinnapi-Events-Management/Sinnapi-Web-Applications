'use client';
import { useState } from 'react';
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import WidthNormalIcon from '@mui/icons-material/WidthNormal';
import WidthFullIcon from '@mui/icons-material/WidthFull';
import type { ViewPreferences } from './hooks/useViewPreferences';

/**
 * One menu for the four ways to reshape the shell, rather than four competing
 * icon buttons in the top bar: collapse the sidebar, hide the chrome, widen the
 * content column, and go fullscreen.
 */
export function PortalViewMenu({ view }: { view: ViewPreferences }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  /** Every item is a one-shot toggle, so the menu closes on selection. */
  const run = (action: () => void) => () => {
    action();
    close();
  };

  const contained = view.contentWidth === 'contained';

  return (
    <>
      <Tooltip title="View options">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="View options">
          <TuneIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={run(view.toggleCollapsed)} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <ListItemIcon>
            {view.collapsed ? (
              <ChevronRightIcon fontSize="small" />
            ) : (
              <ChevronLeftIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{view.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</ListItemText>
        </MenuItem>

        <MenuItem onClick={run(view.toggleContentWidth)}>
          <ListItemIcon>
            {contained ? <WidthFullIcon fontSize="small" /> : <WidthNormalIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText secondary={contained ? undefined : 'Currently full width'}>
            {contained ? 'Widen content' : 'Contain content'}
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={run(view.toggleFocus)}>
          <ListItemIcon>
            <CenterFocusStrongIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText secondary="Hides the sidebar and top bar">Focus mode</ListItemText>
        </MenuItem>

        {view.fullscreenSupported && (
          <MenuItem onClick={run(view.toggleFullscreen)}>
            <ListItemIcon>
              {view.isFullscreen ? (
                <FullscreenExitIcon fontSize="small" />
              ) : (
                <FullscreenIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>{view.isFullscreen ? 'Exit full screen' : 'Full screen'}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

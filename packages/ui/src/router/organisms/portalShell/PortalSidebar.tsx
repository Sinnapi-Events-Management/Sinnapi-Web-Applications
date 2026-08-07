'use client';
import { Box, Drawer } from '@mui/material';
import { DRAWER_WIDTH } from './constants';
import { chromeTransition } from './portalShell.styles';
import { PortalSidebarNav } from './PortalSidebarNav';
import type { PortalSidebarNavProps } from './PortalSidebarNav';

export interface PortalSidebarProps extends Omit<PortalSidebarNavProps, 'mini' | 'onNavigate'> {
  /** Resolved rail/expanded width for the permanent drawer. */
  width: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * The nav column: a temporary drawer on mobile and a permanent, collapsible one
 * from `md` up. The mobile drawer is always expanded — a rail makes no sense in
 * an overlay the user just opened.
 */
export function PortalSidebar({
  width,
  collapsed,
  mobileOpen,
  onCloseMobile,
  ...navProps
}: PortalSidebarProps) {
  return (
    <Box
      component="nav"
      sx={{ width: { md: width }, flexShrink: { md: 0 }, transition: chromeTransition }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        <PortalSidebarNav {...navProps} mini={false} onNavigate={onCloseMobile} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width,
            borderRight: 1,
            borderColor: 'divider',
            overflowX: 'hidden',
            transition: chromeTransition,
          },
        }}
      >
        <PortalSidebarNav {...navProps} mini={collapsed} />
      </Drawer>
    </Box>
  );
}

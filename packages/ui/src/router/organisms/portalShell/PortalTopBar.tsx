'use client';
import type { ReactNode } from 'react';
import { AppBar, Box, Divider, IconButton, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { ThemeToggle } from '../../../molecules/ThemeToggle';
import { chromeTransition, topBarBackground } from './portalShell.styles';
import { PortalAccountMenu } from './PortalAccountMenu';
import { PortalBreadcrumbs } from './PortalBreadcrumbs';
import { PortalMessagesMenu } from './PortalMessagesMenu';
import { PortalNotificationsMenu } from './PortalNotificationsMenu';
import { PortalViewMenu } from './PortalViewMenu';
import type { ViewPreferences } from './hooks/useViewPreferences';
import type {
  PortalAccount,
  PortalCrumb,
  PortalMessagesFeed,
  PortalNotificationsFeed,
} from './types';

export interface PortalTopBarProps {
  crumbs: PortalCrumb[];
  account: PortalAccount;
  view: ViewPreferences;
  /** Left offset and width reserved for the sidebar, animated on collapse. */
  sidebarWidth: number;
  messages?: PortalMessagesFeed;
  notifications?: PortalNotificationsFeed;
  topBarActions?: ReactNode;
  onOpenMobileNav: () => void;
  accountAnchor: HTMLElement | null;
  onOpenAccount: (e: React.MouseEvent<HTMLElement>) => void;
  onCloseAccount: () => void;
}

/**
 * Fixed top bar: nav trigger and breadcrumbs at the leading edge, controls at
 * the trailing edge.
 *
 * The bar is one flex row with exactly one elastic region — the breadcrumb
 * trail. Everything else declares itself unshrinkable, so as the viewport
 * narrows the trail is the only thing that gives up width, and it ellipsises
 * rather than running underneath the controls. The trail's `minWidth: 0` is
 * what makes that true: a flex item's default `min-width: auto` floors it at
 * its content width, which is how a long page title ends up painted over the
 * message and account buttons on a phone.
 */
export function PortalTopBar({
  crumbs,
  account,
  view,
  sidebarWidth,
  messages,
  notifications,
  topBarActions,
  onOpenMobileNav,
  accountAnchor,
  onOpenAccount,
  onCloseAccount,
}: PortalTopBarProps) {
  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: topBarBackground,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        width: { md: `calc(100% - ${sidebarWidth}px)` },
        ml: { md: `${sidebarWidth}px` },
        transition: chromeTransition,
      }}
    >
      <Toolbar sx={{ gap: { xs: 0.25, sm: 0.5 }, px: { xs: 1, sm: 2 }, minWidth: 0 }}>
        <IconButton
          edge="start"
          sx={{ mr: 0.5, display: { md: 'none' }, flexShrink: 0 }}
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>

        {/* The one elastic region: it takes the width the controls don't need
            and hands it back as the viewport narrows. */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
          <PortalBreadcrumbs crumbs={crumbs} />
        </Box>

        {/* Page-supplied controls sit between the trail and the shell's own, and
            shrink with the trail rather than pushing the fixed cluster off the
            bar — a page can hand us anything, including something too wide. */}
        {topBarActions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {topBarActions}
          </Box>
        )}

        {/* The bar's fixed side. Icon buttons hold their measure at every width —
            one squeezed below its glyph would spill over its neighbour — and
            phones buy the room back with tighter padding instead. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0, sm: 0.5 },
            flexShrink: 0,
            ml: 'auto',
            '& .MuiIconButton-root': { p: { xs: 0.75, sm: 1 } },
          }}
        >
          <PortalViewMenu view={view} />
          <ThemeToggle />

          {/* Messages before notifications: a message is addressed to you by a
              person and a notification is not, so it earns the position closer to
              the account menu the eye lands on last. */}
          {messages && <PortalMessagesMenu feed={messages} />}
          {notifications && <PortalNotificationsMenu feed={notifications} />}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.25, flexShrink: 0 }} />
          <PortalAccountMenu
            account={account}
            anchorEl={accountAnchor}
            onOpen={onOpenAccount}
            onClose={onCloseAccount}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

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

/** Fixed top bar: nav trigger and breadcrumbs at the leading edge, controls at the trailing edge. */
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
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          sx={{ mr: 0.5, display: { md: 'none' } }}
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <PortalBreadcrumbs crumbs={crumbs} />
        </Box>

        <Box sx={{ flex: 1 }} />

        {topBarActions}
        <PortalViewMenu view={view} />
        <ThemeToggle />

        {/* Messages before notifications: a message is addressed to you by a
            person and a notification is not, so it earns the position closer to
            the account menu the eye lands on last. */}
        {messages && <PortalMessagesMenu feed={messages} />}
        {notifications && <PortalNotificationsMenu feed={notifications} />}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.25 }} />
        <PortalAccountMenu
          account={account}
          anchorEl={accountAnchor}
          onOpen={onOpenAccount}
          onClose={onCloseAccount}
        />
      </Toolbar>
    </AppBar>
  );
}

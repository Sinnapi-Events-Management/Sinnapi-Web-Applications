'use client';
import { Box } from '@mui/material';
import { BreadcrumbTitleProvider } from './BreadcrumbTitleProvider';
import { PortalBottomNav } from './PortalBottomNav';
import { PortalContent } from './PortalContent';
import { PortalFocusExit } from './PortalFocusExit';
import { PortalSidebar } from './PortalSidebar';
import { PortalTopBar } from './PortalTopBar';
import { BOTTOM_NAV_HEIGHT, BOTTOM_NAV_HEIGHT_VAR } from './constants';
import { usePortalShell } from './hooks/usePortalShell';
import type { PortalShellProps } from './types';

/**
 * The authenticated layout shared by the admin, client and vendor portals:
 * collapsible sidebar, breadcrumbed top bar, and a routed content area.
 *
 * Everything portal-specific arrives as props — nav config, brand assets,
 * account menu, permission predicate — so the three portals stay identical in
 * chrome while differing in content. Render it as the `element` of the
 * protected route group; pages reach it through `Outlet`.
 */
export function PortalShell(props: PortalShellProps) {
  return (
    <BreadcrumbTitleProvider>
      <PortalShellFrame {...props} />
    </BreadcrumbTitleProvider>
  );
}

/**
 * Split from `PortalShell` so the breadcrumb registry is mounted above the
 * frame — the top bar reads labels that pages inside `Outlet` write.
 */
function PortalShellFrame({
  portalId,
  brand,
  sections,
  account,
  can,
  badges = {},
  messages,
  notifications,
  homeLabel,
  banner,
  topBarActions,
  bottomNav,
  bottomNavMoreLabel = 'More',
}: PortalShellProps) {
  const shell = usePortalShell({ portalId, brand, sections, can, homeLabel });
  const { view } = shell;
  const bottomItems = view.focus ? [] : (bottomNav ?? []);
  const showBottomNav = bottomItems.length > 0;

  return (
    <Box
      sx={(t) => ({
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        // Published for anything pinned to the viewport's bottom edge — see
        // `BOTTOM_NAV_HEIGHT_VAR`. Zero from `md` up, where the bar is hidden.
        [BOTTOM_NAV_HEIGHT_VAR]: showBottomNav
          ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
          : '0px',
        [t.breakpoints.up('md')]: { [BOTTOM_NAV_HEIGHT_VAR]: '0px' },
      })}
    >
      {view.focus ? (
        <PortalFocusExit onExit={view.exitFocus} />
      ) : (
        <PortalTopBar
          crumbs={shell.crumbs}
          account={account}
          view={view}
          sidebarWidth={shell.sidebarWidth}
          messages={messages}
          notifications={notifications}
          topBarActions={topBarActions}
          onOpenMobileNav={shell.openMobileNav}
          accountAnchor={shell.accountAnchor}
          onOpenAccount={shell.openAccountMenu}
          onCloseAccount={shell.closeAccountMenu}
        />
      )}

      {!view.focus && (
        <PortalSidebar
          brand={brand}
          logoSrc={shell.logoSrc}
          homeTo={shell.homeTo}
          nav={shell.nav}
          badges={badges}
          width={shell.sidebarWidth}
          collapsed={view.collapsed}
          mobileOpen={shell.mobileOpen}
          onCloseMobile={shell.closeMobileNav}
          onToggleCollapsed={view.toggleCollapsed}
        />
      )}

      <PortalContent
        sidebarWidth={shell.sidebarWidth}
        contentWidth={view.contentWidth}
        focus={view.focus}
        banner={banner}
      />

      {showBottomNav && (
        <PortalBottomNav
          items={bottomItems}
          moreLabel={bottomNavMoreLabel}
          badges={badges}
          onOpenMore={shell.openMobileNav}
        />
      )}
    </Box>
  );
}

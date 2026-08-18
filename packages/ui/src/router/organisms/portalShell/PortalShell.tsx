'use client';
import { Box } from '@mui/material';
import { BreadcrumbTitleProvider } from './BreadcrumbTitleProvider';
import { PortalContent } from './PortalContent';
import { PortalFocusExit } from './PortalFocusExit';
import { PortalSidebar } from './PortalSidebar';
import { PortalTopBar } from './PortalTopBar';
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
}: PortalShellProps) {
  const shell = usePortalShell({ portalId, brand, sections, can, homeLabel });
  const { view } = shell;

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
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
    </Box>
  );
}

'use client';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useColorScheme } from '@mui/material/styles';
import { DRAWER_WIDTH, RAIL_WIDTH } from '../constants';
import { buildCrumbs } from '../breadcrumbs';
import { useBreadcrumbTitles } from '../BreadcrumbTitleProvider';
import type { PortalShellProps } from '../types';
import { useNavModel } from './useNavModel';
import { useViewPreferences } from './useViewPreferences';

/**
 * The shell's single state hook: nav resolution, view preferences, the mobile
 * drawer, the account menu and the breadcrumb trail. `PortalShell` stays purely
 * compositional by consuming everything from here.
 */
export function usePortalShell({
  portalId,
  brand,
  sections,
  can,
  homeLabel = 'Home',
}: Pick<PortalShellProps, 'portalId' | 'brand' | 'sections' | 'can' | 'homeLabel'>) {
  const { pathname } = useLocation();
  const { mode } = useColorScheme();

  const nav = useNavModel({ portalId, sections, pathname, can });
  const view = useViewPreferences(portalId);
  const titles = useBreadcrumbTitles();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const openAccountMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>) => setAccountAnchor(e.currentTarget),
    [],
  );
  const closeAccountMenu = useCallback(() => setAccountAnchor(null), []);

  const homeTo = brand.homeTo ?? '/dashboard';
  const logoSrc = mode === 'dark' ? (brand.logoDarkSrc ?? brand.logoSrc) : brand.logoSrc;

  const crumbs = useMemo(
    () =>
      buildCrumbs({
        pathname,
        sections: nav.visibleSections,
        titles,
        homeLabel,
        homeTo,
        activeSection: nav.activeItem?.section,
      }),
    [pathname, nav.visibleSections, nav.activeItem, titles, homeLabel, homeTo],
  );

  // In focus mode the sidebar is unmounted, so the chrome offsets collapse to
  // zero and the content spans the viewport.
  const sidebarWidth = view.focus ? 0 : view.collapsed ? RAIL_WIDTH : DRAWER_WIDTH;

  return {
    pathname,
    nav,
    view,
    crumbs,
    homeTo,
    logoSrc,
    sidebarWidth,
    mobileOpen,
    openMobileNav,
    closeMobileNav,
    accountAnchor,
    openAccountMenu,
    closeAccountMenu,
  };
}

export type PortalShellState = ReturnType<typeof usePortalShell>;

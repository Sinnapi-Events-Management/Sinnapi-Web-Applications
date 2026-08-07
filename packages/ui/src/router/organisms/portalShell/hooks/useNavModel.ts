'use client';
import { useCallback, useMemo } from 'react';
import { shellStorageKey } from '../constants';
import type { PortalNavItem, PortalNavSection } from '../types';
import { useStoredState } from './useStoredState';

export interface ResolvedNavItem extends PortalNavItem {
  section: string;
}

/** True when `pathname` is `to` or a descendant of it. */
export function isRouteActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function matchesItem(pathname: string, item: PortalNavItem): boolean {
  return (
    isRouteActive(pathname, item.to) || (item.matches ?? []).some((m) => isRouteActive(pathname, m))
  );
}

export interface NavModel {
  /** Sections with permission-hidden items (and emptied sections) removed. */
  visibleSections: PortalNavSection[];
  /** Nav item owning the current route, with its section title attached. */
  activeItem: ResolvedNavItem | undefined;
  isItemActive: (item: PortalNavItem) => boolean;
  isGroupOpen: (title: string) => boolean;
  toggleGroup: (title: string) => void;
}

/**
 * Turns the static nav config plus the current route into everything the
 * sidebar needs to render: what the user may see, what is active, and which
 * groups are expanded.
 */
export function useNavModel({
  portalId,
  sections,
  pathname,
  can,
}: {
  portalId: string;
  sections: PortalNavSection[];
  pathname: string;
  can?: (perm: string) => boolean;
}): NavModel {
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.perm || !can || can(item.perm)),
        }))
        .filter((section) => section.items.length > 0),
    [sections, can],
  );

  // Longest match wins, so `/notification-templates` never resolves to the
  // `/notifications` item.
  const activeItem = useMemo(() => {
    const flat = visibleSections.flatMap((s) =>
      s.items.map((item) => ({ ...item, section: s.title })),
    );
    return flat
      .filter((item) => matchesItem(pathname, item))
      .sort((a, b) => b.to.length - a.to.length)[0];
  }, [visibleSections, pathname]);

  // Only groups the user explicitly toggled are stored; everything else falls
  // back to "open if it owns the active route".
  const [openGroups, setOpenGroups] = useStoredState<Record<string, boolean>>(
    shellStorageKey(portalId, 'groups'),
    {},
  );
  const activeSection = activeItem?.section;

  const isGroupOpen = useCallback(
    (title: string) => openGroups[title] ?? title === activeSection,
    [openGroups, activeSection],
  );

  const toggleGroup = useCallback(
    (title: string) =>
      setOpenGroups((prev) => ({ ...prev, [title]: !(prev[title] ?? title === activeSection) })),
    [setOpenGroups, activeSection],
  );

  const isItemActive = useCallback(
    (item: PortalNavItem) => matchesItem(pathname, item),
    [pathname],
  );

  return { visibleSections, activeItem, isItemActive, isGroupOpen, toggleGroup };
}

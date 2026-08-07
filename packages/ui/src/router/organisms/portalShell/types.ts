import type { ComponentType, ReactNode } from 'react';
import type { SvgIconProps } from '@mui/material';
import type { LinkProps } from 'react-router-dom';

/** Any MUI icon component — `SvgIconComponent` without importing the icons package. */
export type PortalIcon = ComponentType<SvgIconProps>;

export interface PortalNavItem {
  label: string;
  /** Absolute route. Also the identity used for active-state and breadcrumbs. */
  to: string;
  icon: PortalIcon;
  /**
   * Permission key gating visibility. Undefined means "visible to anyone who
   * can reach the portal"; the shell resolves it through the `can` prop, so
   * portals without RBAC (client, vendor) simply never set it.
   */
  perm?: string;
  /** Key into the shell's `badges` record, e.g. `'notifications'`. */
  badgeKey?: string;
  /**
   * Extra routes that should light this item up and resolve to it in the
   * breadcrumb trail, for pages that live outside the item's own path
   * (e.g. `/discover/vendors/:slug` under a `/discover` item is automatic,
   * but `/quotations/compare` under a `/quotations` item is not).
   */
  matches?: string[];
}

export interface PortalNavSection {
  title: string;
  items: PortalNavItem[];
}

export interface PortalBrand {
  /** Product name, used as the logo's alt text. */
  name: string;
  /** Pill beside the wordmark naming the portal, e.g. "Vendor". */
  tagline?: string;
  /** Wordmark shown in light mode. */
  logoSrc: string;
  /** Wordmark shown in dark mode. Falls back to `logoSrc`. */
  logoDarkSrc?: string;
  /** Square mark shown when the sidebar is collapsed to a rail. */
  iconSrc: string;
  /** Where the wordmark navigates. Defaults to `/dashboard`. */
  homeTo?: string;
}

export interface PortalAccountItem {
  label: string;
  icon?: PortalIcon;
  /** Route to navigate to. Mutually exclusive with `onClick`. */
  to?: LinkProps['to'];
  onClick?: () => void | Promise<void>;
  /** Draw a divider immediately above this item. */
  dividerBefore?: boolean;
}

export interface PortalAccount {
  /** Display name in the menu header. */
  name: string;
  /** Second line in the menu header — email, roles, business name. */
  subtitle?: string;
  avatarUrl?: string | null;
  items: PortalAccountItem[];
}

/** One segment of the breadcrumb trail. The last crumb never links. */
export interface PortalCrumb {
  label: string;
  to?: string;
}

/** `contained` caps the reading column; `full` lets it span the viewport. */
export type PortalContentWidth = 'contained' | 'full';

export interface PortalShellProps {
  /**
   * Namespace for this portal's persisted view preferences, e.g. `'admin'`.
   * Keys are written as `sinnapi.<portalId>.shell.*`.
   */
  portalId: string;
  brand: PortalBrand;
  sections: PortalNavSection[];
  account: PortalAccount;
  /** Permission predicate for `perm`-gated items. Defaults to allow-all. */
  can?: (perm: string) => boolean;
  /** Badge counts by `badgeKey`, e.g. `{ notifications: 3 }`. */
  badges?: Record<string, number>;
  /** Route the bell icon links to. Omit to hide the bell. */
  notificationsTo?: string;
  /** Label for the first crumb. Defaults to "Home". */
  homeLabel?: string;
  /** Full-width node rendered above the page content, e.g. a billing alert. */
  banner?: ReactNode;
  /** Extra controls injected into the top bar, left of the theme toggle. */
  topBarActions?: ReactNode;
}

// Public surface of the portal shell. The sidebar/top-bar/menu pieces are
// internal composition details of `PortalShell` — apps configure the shell
// through props rather than reassembling it.
export { PortalShell } from './PortalShell';
export { BreadcrumbTitleProvider, useBreadcrumbTitle } from './BreadcrumbTitleProvider';
export { DRAWER_WIDTH, RAIL_WIDTH, CONTENT_MAX_WIDTH } from './constants';
export { MENU_PREVIEW_LIMIT } from './menuPreview';
export type {
  PortalAccount,
  PortalAccountItem,
  PortalBrand,
  PortalContentWidth,
  PortalCrumb,
  PortalDesktopAlerts,
  PortalIcon,
  PortalMenuFeed,
  PortalMessagesFeed,
  PortalNavItem,
  PortalNavSection,
  PortalNotificationsFeed,
  PortalShellProps,
} from './types';

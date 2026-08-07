import type { PortalCrumb, PortalNavSection } from './types';

/** Ids make terrible crumbs — `/bookings/8f2c…` reads better as "Details". */
const OPAQUE_SEGMENT = /^(\d+|[0-9a-f]{8,}|[0-9a-f-]{20,})$/i;

/** `service-regions` → `Service Regions`. */
function titleize(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function fallbackLabel(segment: string): string {
  return OPAQUE_SEGMENT.test(segment) ? 'Details' : titleize(segment);
}

/** `/a/b/c` → `['/a', '/a/b', '/a/b/c']`. */
function cumulativePaths(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((_, i) => `/${segments.slice(0, i + 1).join('/')}`);
}

/**
 * Builds the breadcrumb trail for a route.
 *
 * Every crumb comes from one of three places, in priority order: a label a page
 * registered for that exact path (`useBreadcrumbTitle`), a nav item whose route
 * matches, or a titleized URL segment. Intermediate segments that are neither a
 * real route nor a registered title are dropped rather than rendered as dead
 * text — `/discover/vendors/:slug` reads `Home / Discover / Bella Events`, not
 * `Home / Discover / Vendors / Bella Events` with an unclickable "Vendors".
 */
export function buildCrumbs({
  pathname,
  sections,
  titles,
  homeLabel,
  homeTo,
  activeSection,
}: {
  pathname: string;
  sections: PortalNavSection[];
  /** Page-supplied labels, keyed by the exact pathname they belong to. */
  titles: Record<string, string>;
  homeLabel: string;
  homeTo: string;
  /** Section owning the active nav item, shown as a non-navigable crumb. */
  activeSection?: string;
}): PortalCrumb[] {
  const navByPath = new Map(sections.flatMap((s) => s.items.map((item) => [item.to, item])));

  const atHome = pathname === homeTo;
  const crumbs: PortalCrumb[] = [{ label: homeLabel, to: atHome ? undefined : homeTo }];
  // On the home route itself the section would land last and be mistaken for the
  // page title, so it's dropped — the trail reads "Home / Dashboard".
  if (activeSection && !atHome) crumbs.push({ label: activeSection });

  for (const path of cumulativePaths(pathname)) {
    const isLast = path === pathname;
    const override = titles[path];
    const navItem = navByPath.get(path);
    // A structural segment: not a route of its own, and no page claimed it.
    if (!override && !navItem && !isLast) continue;

    const segment = path.split('/').pop() ?? '';
    crumbs.push({
      label: override ?? navItem?.label ?? fallbackLabel(segment),
      to: isLast ? undefined : path,
    });
  }

  return crumbs;
}

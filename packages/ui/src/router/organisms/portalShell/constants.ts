/** Expanded sidebar width. Matches the admin portal's established measure. */
export const DRAWER_WIDTH = 264;

/** Collapsed sidebar width — an icon rail wide enough for a 44px touch target. */
export const RAIL_WIDTH = 72;

/**
 * Cap on the reading column in `contained` mode. Wide enough for the densest
 * admin tables, narrow enough that a dashboard on a 27" monitor doesn't stretch
 * into unreadable line lengths.
 */
export const CONTENT_MAX_WIDTH = 1440;

/** Namespaced localStorage key for a portal's shell preference. */
export function shellStorageKey(portalId: string, name: string): string {
  return `sinnapi.${portalId}.shell.${name}`;
}

/** Height of the phone-only bottom tab bar, before the home-indicator inset. */
export const BOTTOM_NAV_HEIGHT = 64;

/**
 * CSS custom property holding the space the bottom tab bar takes on screen:
 * its height plus the safe-area inset on phones that show it, `0px` elsewhere.
 * Anything pinned to the bottom of the viewport — sticky save bars, floating
 * buttons — adds it to its own `bottom` so it sits above the bar, not under it.
 * Read it with a fallback: `var(--portal-bottom-nav-height, 0px)`.
 */
export const BOTTOM_NAV_HEIGHT_VAR = '--portal-bottom-nav-height';

/** `calc()` for a bottom offset that clears the tab bar when there is one. */
export function aboveBottomNav(px: number): string {
  return `calc(${px}px + var(${BOTTOM_NAV_HEIGHT_VAR}, 0px))`;
}
